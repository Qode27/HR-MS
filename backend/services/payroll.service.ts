import { prisma } from "@/lib/db";
import { AppError } from "@backend/utils/errors";

type FormulaConfig = {
  deductionRate: number;
  reimbursementFlat: number;
};

function normalizeFormula(raw: unknown): FormulaConfig {
  const fallback: FormulaConfig = { deductionRate: 0.1, reimbursementFlat: 0 };
  if (!raw || typeof raw !== "object") return fallback;
  const parsed = raw as Record<string, unknown>;
  const deductionRate = Number(parsed.deductionRate ?? fallback.deductionRate);
  const reimbursementFlat = Number(parsed.reimbursementFlat ?? fallback.reimbursementFlat);
  return {
    deductionRate: Number.isFinite(deductionRate) ? Math.min(Math.max(deductionRate, 0), 0.8) : fallback.deductionRate,
    reimbursementFlat: Number.isFinite(reimbursementFlat) ? Math.max(reimbursementFlat, 0) : fallback.reimbursementFlat
  };
}

export class PayrollService {
  private async formula() {
    const setting = await prisma.organizationSetting.findUnique({ where: { key: "payroll.formula" } });
    return normalizeFormula(setting?.value);
  }

  async listRuns() {
    return prisma.payrollRun.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { _count: { select: { items: true } } }
    });
  }

  async runPayroll(input: { month: number; year: number; actorUserId: string }) {
    if (input.month < 1 || input.month > 12) throw new AppError("Invalid month", 422);
    if (input.year < 2000 || input.year > 2100) throw new AppError("Invalid year", 422);

    const existing = await prisma.payrollRun.findUnique({ where: { month_year: { month: input.month, year: input.year } } });
    if (existing?.status === "COMPLETED") throw new AppError("Payroll already finalized for this period", 409);

    const [employees, formula] = await Promise.all([
      prisma.employee.findMany({ where: { deletedAt: null, status: "ACTIVE" } }),
      this.formula()
    ]);
    if (employees.length === 0) throw new AppError("No active employees found", 422);

    const run = await prisma.payrollRun.upsert({
      where: { month_year: { month: input.month, year: input.year } },
      create: {
        month: input.month,
        year: input.year,
        status: "PROCESSING",
        processedById: input.actorUserId
      },
      update: {
        status: "PROCESSING",
        processedById: input.actorUserId
      }
    });

    const result = await prisma.$transaction(async (tx) => {
      await tx.payslip.deleteMany({ where: { payrollItem: { payrollRunId: run.id } } });
      await tx.payrollItem.deleteMany({ where: { payrollRunId: run.id } });

      const items = [] as Array<{ id: string; grossPay: number; deductions: number; netPay: number }>;

      for (const emp of employees) {
        const gross = Number(emp.salaryMonthly);
        const deductions = Math.round(gross * formula.deductionRate);
        const reimbursement = formula.reimbursementFlat;
        const net = gross - deductions + reimbursement;

        const item = await tx.payrollItem.create({
          data: {
            payrollRunId: run.id,
            employeeId: emp.id,
            grossPay: gross,
            deductions,
            reimbursement,
            netPay: net
          }
        });

        await tx.payslip.create({
          data: {
            employeeId: emp.id,
            payrollItemId: item.id,
            month: input.month,
            year: input.year,
            pdfPath: `/payslips/${emp.employeeCode}-${input.year}-${String(input.month).padStart(2, "0")}.pdf`
          }
        });

        items.push({ id: item.id, grossPay: gross, deductions, netPay: net });
      }

      const totals = items.reduce(
        (acc, item) => {
          acc.gross += item.grossPay;
          acc.deductions += item.deductions;
          acc.net += item.netPay;
          return acc;
        },
        { gross: 0, deductions: 0, net: 0 }
      );

      const updatedRun = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          summaryJson: {
            employees: items.length,
            totals,
            formula,
            finalizedAt: new Date().toISOString(),
            finalizedBy: input.actorUserId
          }
        }
      });

      return updatedRun;
    });

    return result;
  }

  async finalizeRun(input: { runId: string; actorUserId: string }) {
    const run = await prisma.payrollRun.findUnique({ where: { id: input.runId } });
    if (!run) throw new AppError("Payroll run not found", 404);
    if (run.status === "COMPLETED") return run;

    return prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        summaryJson: {
          ...(typeof run.summaryJson === "object" && run.summaryJson ? run.summaryJson : {}),
          finalizedAt: new Date().toISOString(),
          finalizedBy: input.actorUserId
        }
      }
    });
  }

  async selfPayslips(userId: string) {
    const employee = await prisma.employee.findFirst({ where: { userId } });
    if (!employee) return [];
    return prisma.payslip.findMany({
      where: { employeeId: employee.id },
      include: { payrollItem: true },
      orderBy: [{ year: "desc" }, { month: "desc" }]
    });
  }
}

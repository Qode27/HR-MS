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

function chunkArray<T>(items: T[], chunkSize: number) {
  if (chunkSize <= 0) return [items];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
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

    const payrollRows = employees.map((emp) => {
      const gross = Number(emp.salaryMonthly);
      const deductions = Math.round(gross * formula.deductionRate);
      const reimbursement = formula.reimbursementFlat;
      const net = gross - deductions + reimbursement;

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        grossPay: gross,
        deductions,
        reimbursement,
        netPay: net
      };
    });

    const totals = payrollRows.reduce(
      (acc, item) => {
        acc.gross += item.grossPay;
        acc.deductions += item.deductions;
        acc.net += item.netPay;
        return acc;
      },
      { gross: 0, deductions: 0, net: 0 }
    );

    try {
      await prisma.$transaction([
        prisma.payslip.deleteMany({ where: { payrollItem: { payrollRunId: run.id } } }),
        prisma.payrollItem.deleteMany({ where: { payrollRunId: run.id } })
      ]);

      for (const batch of chunkArray(payrollRows, 50)) {
        await prisma.payrollItem.createMany({
          data: batch.map((item) => ({
            payrollRunId: run.id,
            employeeId: item.employeeId,
            grossPay: item.grossPay,
            deductions: item.deductions,
            reimbursement: item.reimbursement,
            netPay: item.netPay
          }))
        });
      }

      const createdItems = await prisma.payrollItem.findMany({
        where: { payrollRunId: run.id },
        select: { id: true, employeeId: true }
      });

      const itemIdByEmployeeId = new Map(createdItems.map((item) => [item.employeeId, item.id]));

      for (const batch of chunkArray(payrollRows, 50)) {
        await prisma.payslip.createMany({
          data: batch.map((item) => {
            const payrollItemId = itemIdByEmployeeId.get(item.employeeId);
            if (!payrollItemId) throw new AppError("Failed to link generated payroll items", 500);
            return {
              employeeId: item.employeeId,
              payrollItemId,
              month: input.month,
              year: input.year,
              pdfPath: `/payslips/${item.employeeCode}-${input.year}-${String(input.month).padStart(2, "0")}.pdf`
            };
          })
        });
      }

      return prisma.payrollRun.update({
        where: { id: run.id },
        data: {
          status: "DRAFT",
          summaryJson: {
            employees: payrollRows.length,
            totals,
            formula,
            lastPreparedAt: new Date().toISOString(),
            preparedBy: input.actorUserId
          }
        }
      });
    } catch (error) {
      await prisma.payrollRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          summaryJson: {
            employees: payrollRows.length,
            totals,
            formula,
            failedAt: new Date().toISOString(),
            failedBy: input.actorUserId
          }
        }
      });
      throw error;
    }
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
      where: {
        employeeId: employee.id,
        payrollItem: {
          payrollRun: {
            status: "COMPLETED"
          }
        }
      },
      include: { payrollItem: true },
      orderBy: [{ year: "desc" }, { month: "desc" }]
    });
  }

  async adminOverview() {
    const [runs, employees] = await Promise.all([this.listRuns(), prisma.employee.count({ where: { deletedAt: null, status: "ACTIVE" } })]);
    const totals = runs.reduce(
      (acc, run) => {
        acc.runs += 1;
        acc.draft += run.status === "DRAFT" ? 1 : 0;
        acc.completed += run.status === "COMPLETED" ? 1 : 0;
        acc.net += Number((run.summaryJson as { totals?: { net?: number } } | null)?.totals?.net || 0);
        return acc;
      },
      { runs: 0, draft: 0, completed: 0, net: 0 }
    );
    return { totals: { ...totals, employees }, runs };
  }
}

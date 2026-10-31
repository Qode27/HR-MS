import { prisma } from "@/lib/db";
import { AppError } from "@backend/utils/errors";

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) chunks.push(items.slice(index, index + chunkSize));
  return chunks;
}

function money(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function round2(value: unknown) {
  const amount = money(value);
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function periodBounds(month: number, year: number) {
  return {
    periodStart: new Date(year, month - 1, 1),
    periodEnd: new Date(year, month, 0, 23, 59, 59, 999)
  };
}

function formatPeriod(start?: Date | string | null, end?: Date | string | null, fallback?: string) {
  if (!start || !end) return fallback || "-";
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`;
}

function escapePdfText(value: unknown) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function buildSimplePdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 16 Tf",
    "50 780 Td",
    ...lines.flatMap((line, index) => [
      index === 0 ? "" : "0 -22 Td",
      `(${escapePdfText(line)}) Tj`
    ]).filter(Boolean),
    "ET"
  ].join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${object}\n`;
  }
  const xrefAt = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

function payrollItemDto(item: any) {
  return {
    id: item.id,
    employeeId: item.employeeId,
    calculationType: item.calculationType,
    baseSalary: Number(item.baseSalary || 0),
    hourlyRate: item.perHourRate === null || item.perHourRate === undefined ? null : Number(item.perHourRate),
    perHourRate: item.perHourRate === null || item.perHourRate === undefined ? null : Number(item.perHourRate),
    approvedHours: Number(item.approvedHours || 0),
    allowances: Number(item.allowances || 0),
    grossPay: Number(item.grossPay || 0),
    deductions: Number(item.deductions || 0),
    reimbursement: Number(item.reimbursement || 0),
    netPay: Number(item.netPay || 0),
    employee: item.employee,
    payslip: item.payslip,
    payrollRun: item.payrollRun
  };
}

export class PayrollService {
  async listRuns(tenantId?: string | null) {
    return prisma.payrollRun.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        _count: { select: { items: true } },
        items: {
          include: {
            employee: { select: { employeeCode: true, firstName: true, lastName: true } },
            payslip: { select: { id: true, pdfPath: true } }
          },
          orderBy: { employee: { employeeCode: "asc" } }
        }
      }
    });
  }

  async runPayroll(input: { month: number; year: number; actorUserId: string; tenantId?: string | null }) {
    if (input.month < 1 || input.month > 12) throw new AppError("Invalid month", 422);
    if (input.year < 2000 || input.year > 2100) throw new AppError("Invalid year", 422);

    const tenantWhere = input.tenantId ? { tenantId: input.tenantId } : {};
    const { periodStart, periodEnd } = periodBounds(input.month, input.year);
    const existing = await prisma.payrollRun.findFirst({
      where: {
        ...tenantWhere,
        OR: [
          { month: input.month, year: input.year },
          { periodStart, periodEnd }
        ]
      }
    });
    if (existing?.status === "COMPLETED") throw new AppError("Payroll is already completed and locked for this period", 409);
    if (existing && ["RUNNING", "PROCESSING"].includes(existing.status)) throw new AppError("Payroll is already running for this period", 409);
    if (existing && ["DRAFT", "FAILED"].includes(existing.status)) {
      throw new AppError("A payroll run already exists for this period. Resolve or remove the existing draft/failed run before starting a new one.", 409);
    }

    const employees = await prisma.employee.findMany({
      where: { deletedAt: null, status: "ACTIVE", ...tenantWhere },
      select: {
        id: true,
        userId: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        salaryMonthly: true,
        salaryType: true,
        baseSalary: true,
        hourlyRate: true,
        allowances: true,
        deductions: true
      },
      orderBy: { employeeCode: "asc" }
    });
    if (employees.length === 0) throw new AppError("No active employees found", 422);

    const userIds = employees.map((employee) => employee.userId).filter(Boolean) as string[];
    const pendingTimesheets = userIds.length
      ? await prisma.timesheet.count({
          where: {
            userId: { in: userIds },
            ...(input.tenantId ? { tenantId: input.tenantId } : {}),
            status: { in: ["PENDING", "SUBMITTED", "MANAGER_APPROVED"] },
            date: { gte: periodStart, lte: periodEnd }
          }
        })
      : 0;
    if (pendingTimesheets > 0) {
      throw new AppError(`Payroll cannot be run because ${pendingTimesheets} submitted timesheet${pendingTimesheets === 1 ? " is" : "s are"} still pending approval for this period.`, 409);
    }

    const approvedTimesheets = userIds.length
      ? await prisma.timesheet.groupBy({
          by: ["userId"],
          where: {
            userId: { in: userIds },
            ...(input.tenantId ? { tenantId: input.tenantId } : {}),
            status: "APPROVED",
            payrollRunId: null,
            date: { gte: periodStart, lte: periodEnd }
          },
          _sum: { hoursWorked: true }
        })
      : [];
    const approvedHoursByUserId = new Map(approvedTimesheets.map((row) => [row.userId, Number(row._sum.hoursWorked || 0)]));

    const payrollRows = employees.map((employee) => {
      const approvedHours = employee.userId ? approvedHoursByUserId.get(employee.userId) || 0 : 0;
      const hourlyRate = employee.hourlyRate === null || employee.hourlyRate === undefined ? 0 : money(employee.hourlyRate);
      const baseSalary = money(employee.baseSalary) || money(employee.salaryMonthly);
      const allowances = money(employee.allowances);
      const deductions = money(employee.deductions);
      const calculationType = employee.salaryType;
      if (calculationType === "HOURLY" && hourlyRate <= 0) {
        throw new AppError(`Hourly rate missing for ${employee.employeeCode} - ${employee.firstName} ${employee.lastName}`, 422);
      }
      const grossPay = calculationType === "HOURLY" ? round2(approvedHours * hourlyRate) : round2(baseSalary + allowances);
      const netPay = round2(Math.max(0, calculationType === "HOURLY" ? grossPay : grossPay - deductions));
      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        calculationType,
        baseSalary,
        perHourRate: calculationType === "HOURLY" ? hourlyRate : null,
        approvedHours: round2(approvedHours),
        allowances: calculationType === "HOURLY" ? 0 : allowances,
        grossPay,
        deductions: calculationType === "HOURLY" ? 0 : deductions,
        reimbursement: 0,
        netPay
      };
    });

    const totals = payrollRows.reduce(
      (acc, item) => {
        acc.gross = round2(acc.gross + item.grossPay);
        acc.allowances = round2(acc.allowances + item.allowances);
        acc.deductions = round2(acc.deductions + item.deductions);
        acc.net = round2(acc.net + item.netPay);
        acc.approvedHours = round2(acc.approvedHours + item.approvedHours);
        acc.hourlyEmployees += item.calculationType === "HOURLY" ? 1 : 0;
        acc.fixedEmployees += item.calculationType === "FIXED" ? 1 : 0;
        return acc;
      },
      { gross: 0, allowances: 0, deductions: 0, net: 0, approvedHours: 0, hourlyEmployees: 0, fixedEmployees: 0 }
    );

    const run = await prisma.payrollRun.create({
      data: {
        tenantId: input.tenantId,
        month: input.month,
        year: input.year,
        periodStart,
        periodEnd,
        status: "RUNNING",
        processedById: input.actorUserId,
        runByUserId: input.actorUserId,
        runAt: new Date()
      }
    });

    try {
      const completedRun = await prisma.$transaction(async (tx) => {
        await tx.payrollItem.createMany({
          data: payrollRows.map((item) => ({
            payrollRunId: run.id,
            employeeId: item.employeeId,
            calculationType: item.calculationType,
            baseSalary: item.baseSalary,
            perHourRate: item.perHourRate,
            approvedHours: item.approvedHours,
            allowances: item.allowances,
            grossPay: item.grossPay,
            deductions: item.deductions,
            reimbursement: 0,
            netPay: item.netPay
          }))
        });

        const createdItems = await tx.payrollItem.findMany({
          where: { payrollRunId: run.id },
          select: { id: true, employeeId: true }
        });
        const itemIdByEmployeeId = new Map(createdItems.map((item) => [item.employeeId, item]));

        for (const batch of chunkArray(payrollRows, 50)) {
          await tx.payslip.createMany({
            data: batch.map((item) => {
              const payrollItem = itemIdByEmployeeId.get(item.employeeId);
              if (!payrollItem) throw new AppError("Failed to link generated payroll items", 500);
              return {
                employeeId: item.employeeId,
                payrollItemId: payrollItem.id,
                month: input.month,
                year: input.year,
                pdfPath: `/api/payslip/${payrollItem.id}`
              };
            })
          });
        }

        await tx.timesheet.updateMany({
          where: {
            userId: { in: userIds },
            ...(input.tenantId ? { tenantId: input.tenantId } : {}),
            status: "APPROVED",
            payrollRunId: null,
            date: { gte: periodStart, lte: periodEnd }
          },
          data: { payrollRunId: run.id }
        });

        return tx.payrollRun.update({
          where: { id: run.id },
          data: {
            status: "COMPLETED",
            summaryJson: {
              employees: payrollRows.length,
              totals,
              source: "approved_timesheets",
              periodStart: periodStart.toISOString(),
              periodEnd: periodEnd.toISOString(),
              lockedAt: new Date().toISOString(),
              lockedBy: input.actorUserId,
              calculation: "HOURLY = approvedHours * hourlyRate; FIXED = baseSalary + allowances - deductions",
              rows: payrollRows
            }
          },
          include: {
            _count: { select: { items: true } },
            items: {
              include: {
                employee: { select: { employeeCode: true, firstName: true, lastName: true } },
                payslip: { select: { id: true, pdfPath: true } }
              },
              orderBy: { employee: { employeeCode: "asc" } }
            }
          }
        });
      });

      return completedRun;
    } catch (error) {
      await prisma.payrollRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          summaryJson: { employees: payrollRows.length, totals, failedAt: new Date().toISOString(), failedBy: input.actorUserId }
        }
      });
      throw error;
    }
  }

  async finalizeRun(input: { runId: string; actorUserId: string; tenantId?: string | null }) {
    const run = await prisma.payrollRun.findFirst({ where: { id: input.runId, ...(input.tenantId ? { tenantId: input.tenantId } : {}) } });
    if (!run) throw new AppError("Payroll run not found", 404);
    if (run.status === "COMPLETED") return run;
    return prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        runByUserId: run.runByUserId ?? input.actorUserId,
        runAt: run.runAt ?? new Date(),
        summaryJson: { ...(typeof run.summaryJson === "object" && run.summaryJson ? run.summaryJson : {}), lockedAt: new Date().toISOString(), lockedBy: input.actorUserId }
      }
    });
  }

  async selfPayslips(userId: string, tenantId?: string | null) {
    const employee = await prisma.employee.findFirst({ where: { userId, ...(tenantId ? { tenantId } : {}) } });
    if (!employee) return [];
    return prisma.payslip.findMany({
      where: { employeeId: employee.id, payrollItem: { payrollRun: { status: "COMPLETED", ...(tenantId ? { tenantId } : {}) } } },
      include: { payrollItem: { include: { payrollRun: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }]
    });
  }

  async adminOverview(tenantId?: string | null) {
    const tenantWhere = tenantId ? { tenantId } : {};
    const [runs, employees] = await Promise.all([this.listRuns(tenantId), prisma.employee.count({ where: { deletedAt: null, status: "ACTIVE", ...tenantWhere } })]);
    const totals = runs.reduce(
      (acc, run) => {
        const summary = run.summaryJson as { totals?: { net?: number; gross?: number; approvedHours?: number } } | null;
        acc.runs += 1;
        acc.locked += run.status === "COMPLETED" ? 1 : 0;
        acc.processing += ["RUNNING", "PROCESSING"].includes(run.status) ? 1 : 0;
        acc.net += money(summary?.totals?.net);
        acc.gross += money(summary?.totals?.gross);
        acc.approvedHours += money(summary?.totals?.approvedHours);
        return acc;
      },
      { runs: 0, locked: 0, processing: 0, net: 0, gross: 0, approvedHours: 0 }
    );
    return { totals: { ...totals, employees }, runs };
  }

  async getPayslip(input: { payrollItemId: string; userId: string; role: string; tenantId?: string | null }) {
    const item = await prisma.payrollItem.findFirst({
      where: {
        id: input.payrollItemId,
        payrollRun: input.role === "MASTER_ADMIN" ? { status: "COMPLETED" } : { status: "COMPLETED", ...(input.tenantId ? { tenantId: input.tenantId } : {}) }
      },
      include: {
        employee: { include: { user: { select: { id: true, email: true, fullName: true } }, department: true, designation: true } },
        payrollRun: true,
        payslip: true
      }
    });
    if (!item) throw new AppError("Payslip not found", 404);
    if (input.role === "EMPLOYEE" && item.employee.userId !== input.userId) throw new AppError("Forbidden", 403);
    return payrollItemDto(item);
  }

  async payslipPdf(input: { payrollItemId: string; userId: string; role: string; tenantId?: string | null }) {
    const item = await this.getPayslip(input);
    const lines = [
      "Payslip",
      `Employee: ${item.employee.firstName} ${item.employee.lastName} (${item.employee.employeeCode})`,
      `Period: ${formatPeriod(item.payrollRun?.periodStart, item.payrollRun?.periodEnd, `${item.payslip?.month}/${item.payslip?.year}`)}`,
      `Calculation: ${item.calculationType}`,
      `Approved Hours: ${item.approvedHours}`,
      `Base Salary: ${item.baseSalary}`,
      `Hourly Rate: ${item.hourlyRate ?? item.perHourRate ?? "-"}`,
      `Allowances: ${item.allowances}`,
      `Gross Pay: ${item.grossPay}`,
      `Deductions: ${item.deductions}`,
      `Net Pay: ${item.netPay}`
    ];
    return buildSimplePdf(lines);
  }
}

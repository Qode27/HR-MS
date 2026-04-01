import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { AppError } from "@backend/utils/errors";

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "reports:read");

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || "csv").toLowerCase();

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    include: { department: true, designation: true },
    take: 5000
  });

  const rows = employees.map((e) => ({
    employeeCode: e.employeeCode,
    firstName: e.firstName,
    lastName: e.lastName,
    department: e.department.name,
    designation: e.designation.name,
    status: e.status,
    joiningDate: e.joiningDate.toISOString().slice(0, 10)
  }));

  if (format === "csv") {
    const header = Object.keys(rows[0] || {}).join(",");
    const body = rows.map((r) => Object.values(r).map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    return new Response(`${header}\n${body}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="employee-report.csv"'
      }
    });
  }

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="employee-report.xlsx"'
      }
    });
  }

  throw new AppError("Unsupported export format", 400);
});

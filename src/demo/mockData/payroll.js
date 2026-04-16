import { employees } from "./employees.js";

const byCode = Object.fromEntries(employees.map((employee) => [employee.employeeCode, employee]));

export const payrollRuns = [
  {
    id: "pr-2026-03",
    month: 3,
    year: 2026,
    status: "COMPLETED",
    summaryJson: {
      totals: {
        gross: 1875000,
        deductions: 221850,
        net: 1653150
      }
    }
  },
  {
    id: "pr-2026-04",
    month: 4,
    year: 2026,
    status: "DRAFT",
    summaryJson: {
      totals: {
        gross: 1892000,
        deductions: 224500,
        net: 1667500
      }
    }
  }
];

export const payrollItems = employees.map((employee, index) => {
  const gross = Number(employee.salaryMonthly);
  const deductions = Math.round(gross * 0.12) + (index % 2) * 250;
  const netPay = gross - deductions;
  return {
    id: `pi-${index + 1}`,
    payrollRunId: "pr-2026-03",
    employeeCode: employee.employeeCode,
    grossPay: gross,
    deductions,
    netPay
  };
});

export const payslips = employees.slice(0, 12).map((employee, index) => ({
  id: `ps-${index + 1}`,
  employeeCode: employee.employeeCode,
  month: 3,
  year: 2026,
  pdfPath: `/demo/payslips/${employee.employeeCode}-2026-03.pdf`
})).map((slip) => ({
  ...slip,
  employeeName: `${byCode[slip.employeeCode]?.firstName || ""} ${byCode[slip.employeeCode]?.lastName || ""}`.trim()
}));

import { employees } from "./employees.js";

const byCode = Object.fromEntries(employees.map((employee) => [employee.employeeCode, employee]));

export const leaveTypes = [
  { id: "lt-cl", name: "Casual Leave", code: "CL", annualQuota: 12, carryForward: false },
  { id: "lt-sl", name: "Sick Leave", code: "SL", annualQuota: 10, carryForward: false },
  { id: "lt-el", name: "Earned Leave", code: "EL", annualQuota: 15, carryForward: true }
];

export const leaveBalances = employees.flatMap((employee, index) =>
  leaveTypes.map((leaveType, leaveIndex) => ({
    id: `lb-${index + 1}-${leaveIndex + 1}`,
    employeeCode: employee.employeeCode,
    leaveTypeCode: leaveType.code,
    year: 2026,
    allocated: leaveType.annualQuota,
    used: (index + leaveIndex) % (leaveType.code === "EL" ? 4 : 3)
  }))
);

export const leaveRequests = [
  {
    id: "lr-001",
    employeeCode: "ENG0002",
    leaveTypeCode: "CL",
    startDate: "2026-04-07",
    endDate: "2026-04-08",
    reason: "Family travel",
    status: "PENDING",
    workflow: { stage: "MANAGER_PENDING" }
  },
  {
    id: "lr-002",
    employeeCode: "SUP0002",
    leaveTypeCode: "SL",
    startDate: "2026-04-03",
    endDate: "2026-04-03",
    reason: "Medical appointment",
    status: "APPROVED",
    workflow: { stage: "COMPLETED", hrDecisionBy: "demo-user" }
  },
  {
    id: "lr-003",
    employeeCode: "FIN0002",
    leaveTypeCode: "EL",
    startDate: "2026-04-12",
    endDate: "2026-04-14",
    reason: "Personal commitment",
    status: "PENDING",
    workflow: { stage: "MANAGER_PENDING" }
  },
  {
    id: "lr-004",
    employeeCode: "MKT0002",
    leaveTypeCode: "CL",
    startDate: "2026-03-28",
    endDate: "2026-03-28",
    reason: "Urgent work",
    status: "REJECTED",
    workflow: { stage: "REJECTED", note: "Peak campaign week" }
  }
].map((request) => ({
  ...request,
  employeeName: `${byCode[request.employeeCode]?.firstName || ""} ${byCode[request.employeeCode]?.lastName || ""}`.trim()
}));

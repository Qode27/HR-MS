export type ReportDefinition = {
  key: string;
  title: string;
  group: string;
  description: string;
  columns: string[];
  filters: string[];
  exportable: boolean;
};

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    key: "employee-master",
    title: "Employee Master List",
    group: "Employee Reports",
    description: "Full employee directory with department, designation, status, and joining date.",
    columns: ["Employee Code", "Name", "Department", "Designation", "Status", "Joining Date"],
    filters: ["year"],
    exportable: true
  },
  {
    key: "department-headcount",
    title: "Department-wise Employee Report",
    group: "Employee Reports",
    description: "Department headcount and active employee distribution.",
    columns: ["Department", "Employees"],
    filters: [],
    exportable: true
  },
  {
    key: "joining-report",
    title: "Joining Report",
    group: "Employee Reports",
    description: "Employees who joined within the selected month and year.",
    columns: ["Employee Code", "Name", "Department", "Joining Date"],
    filters: ["month", "year"],
    exportable: true
  },
  {
    key: "attendance-monthly",
    title: "Monthly Attendance Summary",
    group: "Attendance Reports",
    description: "Attendance totals by employee for the selected month.",
    columns: ["Employee", "Present", "Absent", "On Leave", "Late Minutes"],
    filters: ["month", "year"],
    exportable: true
  },
  {
    key: "leave-history",
    title: "Leave History",
    group: "Leave Reports",
    description: "Leave applications with type, dates, and approval status.",
    columns: ["Employee", "Leave Type", "Start Date", "End Date", "Status"],
    filters: ["month", "year"],
    exportable: true
  },
  {
    key: "payroll-summary",
    title: "Payroll Summary by Month",
    group: "Payroll Reports",
    description: "Prepared and finalized payroll runs with employee count and net payout.",
    columns: ["Month", "Year", "Status", "Employees", "Net Pay"],
    filters: ["year"],
    exportable: true
  },
  {
    key: "ats-pipeline",
    title: "Candidate Pipeline Summary",
    group: "ATS Reports",
    description: "Candidate volume by stage plus open job count.",
    columns: ["Stage", "Candidates"],
    filters: [],
    exportable: true
  },
  {
    key: "document-register",
    title: "Document Register",
    group: "Document Reports",
    description: "Document inventory with scope, category, owner, and upload date.",
    columns: ["File", "Type", "Scope", "Owner", "Uploaded"],
    filters: [],
    exportable: true
  }
];

export function getReportDefinition(key: string) {
  return REPORT_DEFINITIONS.find((report) => report.key === key);
}

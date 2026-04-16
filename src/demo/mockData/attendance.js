import { employees } from "./employees.js";

const byCode = Object.fromEntries(employees.map((employee) => [employee.employeeCode, employee]));
const dates = ["2026-03-30", "2026-03-31", "2026-04-01"];

export const attendanceRecords = employees.flatMap((employee, index) => {
  const day = dates[index % dates.length];
  const checkInHour = 9 + (index % 2);
  const workMinutes = 460 + (index % 6) * 15;
  const checkOutHour = 17 + Math.floor(workMinutes / 60 / 2);

  return [
    {
      id: `att-${index + 1}-a`,
      employeeCode: employee.employeeCode,
      date: day,
      checkIn: `${day}T${String(checkInHour).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}:00Z`,
      checkOut: `${day}T${String(checkOutHour).padStart(2, "0")}:${String((index * 11) % 60).padStart(2, "0")}:00Z`,
      status: index % 7 === 0 ? "HALF_DAY" : "PRESENT",
      workMinutes
    }
  ];
}).concat([
  {
    id: "att-pending-1",
    employeeCode: "ENG0002",
    date: "2026-04-01",
    checkIn: null,
    checkOut: null,
    status: "ABSENT",
    workMinutes: 0
  },
  {
    id: "att-pending-2",
    employeeCode: "SUP0002",
    date: "2026-04-01",
    checkIn: "2026-04-01T09:18:00Z",
    checkOut: null,
    status: "PRESENT",
    workMinutes: 250
  }
]).map((record) => ({
  ...record,
  employeeName: `${byCode[record.employeeCode]?.firstName || ""} ${byCode[record.employeeCode]?.lastName || ""}`.trim()
}));

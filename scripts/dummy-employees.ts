import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { PrismaClient, EmploymentType } from "@prisma/client";

const prisma = new PrismaClient();

type DummyEmployeeRow = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  personalEmail: string;
  phone: string;
  joiningDate: string;
  employmentType: EmploymentType;
  department: string;
  designation: string;
  managerCode: string;
  workLocation: string;
  salaryMonthly: number;
  skills: string;
};

const firstNames = [
  "Aarav", "Diya", "Kabir", "Meera", "Ishaan", "Anaya", "Rohan", "Sana", "Vivaan", "Aanya",
  "Arjun", "Priya", "Karan", "Ira", "Rahul", "Nisha", "Dev", "Riya", "Om", "Pooja"
];

const lastNames = [
  "Sharma", "Verma", "Patel", "Gupta", "Singh", "Reddy", "Khan", "Nair", "Mehta", "Joshi"
];

const departments = ["Engineering", "HR", "Finance", "Sales", "Marketing", "Operations", "Support", "Legal", "Design", "IT"];
const designations = [
  "Software Engineer",
  "Senior Engineer",
  "HR Executive",
  "Payroll Analyst",
  "Recruiter",
  "Manager",
  "Team Lead",
  "Operations Specialist",
  "Designer",
  "Admin Associate"
];
const locations = ["Bengaluru HQ", "Mumbai", "Delhi"];
const employmentTypes: EmploymentType[] = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"];

function buildRows(): DummyEmployeeRow[] {
  return Array.from({ length: 100 }, (_, index) => {
    const number = index + 1;
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[index % lastNames.length];
    const department = departments[index % departments.length];
    const designation = designations[index % designations.length];
    const location = locations[index % locations.length];
    const employmentType = employmentTypes[index % employmentTypes.length];
    const joiningMonth = (index % 12) + 1;
    const joiningDay = ((index * 3) % 26) + 1;
    const salaryMonthly = 32000 + index * 875;

    return {
      employeeCode: `DUM-${String(number).padStart(4, "0")}`,
      firstName,
      lastName,
      personalEmail: `dummy${number}@peopleflow.local`,
      phone: `9${String(100000000 + number).slice(1)}`,
      joiningDate: new Date(2025, joiningMonth - 1, joiningDay).toISOString().slice(0, 10),
      employmentType,
      department,
      designation,
      managerCode: number % 10 === 0 ? "MGR0001" : number % 7 === 0 ? "MGR0002" : "",
      workLocation: location,
      salaryMonthly,
      skills: ["Communication", "Excel", "HRMS", `Skill${number}`].join(", ")
    };
  });
}

async function ensureWorkbook(rows: DummyEmployeeRow[]) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Employees");

  const outputDir = path.resolve(process.cwd(), "data");
  await fs.mkdir(outputDir, { recursive: true });

  const filePath = path.join(outputDir, "dummy-employees.xlsx");
  XLSX.writeFile(workbook, filePath);
  return filePath;
}

async function main() {
  const rows = buildRows();
  const filePath = await ensureWorkbook(rows);

  const [departmentsRows, designationsRows, locationsRows, managers] = await Promise.all([
    prisma.department.findMany({ where: { deletedAt: null } }),
    prisma.designation.findMany(),
    prisma.workLocation.findMany(),
    prisma.employee.findMany({
      where: { employeeCode: { in: ["MGR0001", "MGR0002"] } },
      select: { id: true, employeeCode: true }
    })
  ]);

  if (departmentsRows.length === 0 || designationsRows.length === 0 || locationsRows.length === 0) {
    throw new Error("Required reference data is missing. Run the app seed first.");
  }

  const deptByName = new Map(departmentsRows.map((row) => [row.name, row]));
  const desigByName = new Map(designationsRows.map((row) => [row.name, row]));
  const locationByName = new Map(locationsRows.map((row) => [row.name, row]));
  const managerByCode = new Map(managers.map((row) => [row.employeeCode, row.id]));

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const department = deptByName.get(row.department) ?? departmentsRows[0];
    const designation = desigByName.get(row.designation) ?? designationsRows[0];
    const location = locationByName.get(row.workLocation) ?? locationsRows[0];
    const managerId = managerByCode.get(row.managerCode) || undefined;

    const result = await prisma.employee.upsert({
      where: { employeeCode: row.employeeCode },
      update: {
        firstName: row.firstName,
        lastName: row.lastName,
        personalEmail: row.personalEmail,
        phone: row.phone,
        joiningDate: new Date(row.joiningDate),
        employmentType: row.employmentType,
        departmentId: department.id,
        designationId: designation.id,
        managerId,
        workLocationId: location.id,
        salaryMonthly: row.salaryMonthly,
        skills: row.skills.split(",").map((item) => item.trim()).filter(Boolean)
      },
      create: {
        employeeCode: row.employeeCode,
        firstName: row.firstName,
        lastName: row.lastName,
        personalEmail: row.personalEmail,
        phone: row.phone,
        joiningDate: new Date(row.joiningDate),
        employmentType: row.employmentType,
        departmentId: department.id,
        designationId: designation.id,
        managerId,
        workLocationId: location.id,
        salaryMonthly: row.salaryMonthly,
        skills: row.skills.split(",").map((item) => item.trim()).filter(Boolean)
      }
    });

    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created += 1;
    } else {
      updated += 1;
    }
  }

  console.log(`Wrote workbook: ${filePath}`);
  console.log(`Imported ${rows.length} dummy employees (${created} created, ${updated} updated).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

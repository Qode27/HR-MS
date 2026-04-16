import bcrypt from "bcryptjs";
import { PrismaClient, RoleName, CandidateStage, CandidateSource } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123", 12);
  await prisma.interviewFeedback.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.candidateActivity.deleteMany();
  await prisma.candidateComment.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.jobOpening.deleteMany();
  await prisma.jobRequisition.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrollItem.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();

  const roleNames: RoleName[] = ["SUPER_ADMIN", "HR_ADMIN", "RECRUITER", "MANAGER", "EMPLOYEE"];
  for (const role of roleNames) {
    await prisma.role.upsert({ where: { name: role }, update: {}, create: { name: role, description: `${role} role` } });
  }

  const permissionMap: Record<RoleName, string[]> = {
    SUPER_ADMIN: ["*"],
    HR_ADMIN: [
      "dashboard:read",
      "employee:read",
      "employee:manage",
      "attendance:read",
      "attendance:manage",
      "leave:self",
      "leave:manage",
      "leave:approve",
      "payroll:self",
      "payroll:manage",
      "onboarding:manage",
      "ats:manage",
      "reports:read",
      "settings:manage"
    ],
    RECRUITER: ["dashboard:read", "ats:manage", "onboarding:manage", "employee:read", "attendance:read"],
    MANAGER: ["dashboard:read", "team:read", "leave:approve", "attendance:read", "ats:collaborate", "employee:read"],
    EMPLOYEE: ["dashboard:read", "self:read", "self:update", "attendance:self", "leave:self", "payroll:self"]
  };

  const allPermissions = Array.from(new Set(Object.values(permissionMap).flat()));
  for (const key of allPermissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key.replace(":", " ") }
    });
  }

  const roles = await prisma.role.findMany();
  for (const role of roles) {
    const keys = permissionMap[role.name];
    for (const key of keys) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { key } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id }
      });
    }
  }

  const departments = ["Engineering", "HR", "Finance", "Sales", "Marketing", "Operations", "Support", "Legal", "Design", "IT"];
  for (const [i, name] of departments.entries()) {
    await prisma.department.upsert({ where: { name }, update: {}, create: { name, code: `DPT${String(i + 1).padStart(2, "0")}` } });
  }

  const designations = ["Software Engineer", "Senior Engineer", "HR Executive", "Payroll Analyst", "Recruiter", "Manager", "Team Lead", "Operations Specialist", "Designer", "Admin Associate"];
  for (const name of designations) {
    await prisma.designation.upsert({ where: { name }, update: {}, create: { name } });
  }

  const locations = [
    { name: "Bengaluru HQ", city: "Bengaluru", country: "India" },
    { name: "Mumbai", city: "Mumbai", country: "India" },
    { name: "Delhi", city: "Delhi", country: "India" }
  ];
  for (const loc of locations) {
    await prisma.workLocation.upsert({ where: { name: loc.name }, update: {}, create: loc });
  }

  await prisma.leaveType.upsert({ where: { code: "CL" }, update: {}, create: { name: "Casual Leave", code: "CL", annualQuota: 12 } });
  await prisma.leaveType.upsert({ where: { code: "SL" }, update: {}, create: { name: "Sick Leave", code: "SL", annualQuota: 10 } });
  await prisma.leaveType.upsert({ where: { code: "EL" }, update: {}, create: { name: "Earned Leave", code: "EL", annualQuota: 15, carryForward: true } });
  await prisma.organizationSetting.upsert({
    where: { key: "company.profile" },
    update: {},
    create: {
      key: "company.profile",
      value: { name: "PeopleFlow HR", timezone: "Asia/Calcutta", currency: "INR" }
    }
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
  const hrRole = await prisma.role.findUniqueOrThrow({ where: { name: "HR_ADMIN" } });
  const recruiterRole = await prisma.role.findUniqueOrThrow({ where: { name: "RECRUITER" } });
  const managerRole = await prisma.role.findUniqueOrThrow({ where: { name: "MANAGER" } });
  const employeeRole = await prisma.role.findUniqueOrThrow({ where: { name: "EMPLOYEE" } });

  const baseUsers = [
    { email: "admin@peopleflow.local", fullName: "Aarav Admin", roleId: adminRole.id },
    { email: "hr@peopleflow.local", fullName: "Harini HR", roleId: hrRole.id },
    { email: "recruiter1@peopleflow.local", fullName: "Riya Recruiter", roleId: recruiterRole.id },
    { email: "recruiter2@peopleflow.local", fullName: "Kabir Recruiter", roleId: recruiterRole.id },
    { email: "manager1@peopleflow.local", fullName: "Mohan Manager", roleId: managerRole.id },
    { email: "manager2@peopleflow.local", fullName: "Nisha Manager", roleId: managerRole.id },
    { email: "employee@peopleflow.local", fullName: "Esha Employee", roleId: employeeRole.id }
  ];

  for (const u of baseUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { fullName: u.fullName, roleId: u.roleId, passwordHash },
      create: { ...u, passwordHash }
    });
  }

  const deptRows = await prisma.department.findMany();
  const desigRows = await prisma.designation.findMany();
  const locationRows = await prisma.workLocation.findMany();
  const leaveRows = await prisma.leaveType.findMany();

  const departmentByName = new Map(deptRows.map((row) => [row.name, row]));
  const designationByName = new Map(desigRows.map((row) => [row.name, row]));
  const locationByName = new Map(locationRows.map((row) => [row.name, row]));
  const adminLeaveDefaults = new Map(leaveRows.map((row) => [row.id, row.annualQuota]));

  const baseEmployeeProfiles = [
    {
      email: "admin@peopleflow.local",
      employeeCode: "ADM0001",
      firstName: "Aarav",
      lastName: "Admin",
      department: "IT",
      designation: "Admin Associate",
      location: "Bengaluru HQ",
      salaryMonthly: 90000
    },
    {
      email: "hr@peopleflow.local",
      employeeCode: "HR0001",
      firstName: "Harini",
      lastName: "HR",
      department: "HR",
      designation: "HR Executive",
      location: "Bengaluru HQ",
      salaryMonthly: 75000
    },
    {
      email: "recruiter1@peopleflow.local",
      employeeCode: "REC0001",
      firstName: "Riya",
      lastName: "Recruiter",
      department: "HR",
      designation: "Recruiter",
      location: "Bengaluru HQ",
      salaryMonthly: 70000
    },
    {
      email: "recruiter2@peopleflow.local",
      employeeCode: "REC0002",
      firstName: "Kabir",
      lastName: "Recruiter",
      department: "HR",
      designation: "Recruiter",
      location: "Bengaluru HQ",
      salaryMonthly: 70000
    },
    {
      email: "manager1@peopleflow.local",
      employeeCode: "MGR0001",
      firstName: "Mohan",
      lastName: "Manager",
      department: "Engineering",
      designation: "Manager",
      location: "Bengaluru HQ",
      salaryMonthly: 120000
    },
    {
      email: "manager2@peopleflow.local",
      employeeCode: "MGR0002",
      firstName: "Nisha",
      lastName: "Manager",
      department: "Operations",
      designation: "Manager",
      location: "Bengaluru HQ",
      salaryMonthly: 120000
    },
    {
      email: "employee@peopleflow.local",
      employeeCode: "EMP0001",
      firstName: "Esha",
      lastName: "Employee",
      department: "Engineering",
      designation: "Software Engineer",
      location: "Bengaluru HQ",
      salaryMonthly: 65000
    }
  ] as const;

  for (const profile of baseEmployeeProfiles) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: profile.email } });
    const department = departmentByName.get(profile.department) ?? deptRows[0];
    const designation = designationByName.get(profile.designation) ?? desigRows[0];
    const workLocation = locationByName.get(profile.location) ?? locationRows[0];
    const employee = await prisma.employee.upsert({
      where: { userId: user.id },
      update: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        employeeCode: profile.employeeCode,
        departmentId: department.id,
        designationId: designation.id,
        workLocationId: workLocation.id,
        salaryMonthly: profile.salaryMonthly
      },
      create: {
        employeeCode: profile.employeeCode,
        userId: user.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        personalEmail: user.email,
        joiningDate: new Date(2025, 0, 1),
        employmentType: "FULL_TIME",
        departmentId: department.id,
        designationId: designation.id,
        workLocationId: workLocation.id,
        salaryMonthly: profile.salaryMonthly,
        skills: ["Communication", "HRMS"]
      }
    });

    for (const leaveType of leaveRows) {
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: leaveType.id, year: 2026 } },
        update: {},
        create: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year: 2026,
          allocated: adminLeaveDefaults.get(leaveType.id) ?? leaveType.annualQuota,
          used: 0
        }
      });
    }
  }

  const managerUsers = await prisma.user.findMany({ where: { role: { name: { in: ["MANAGER", "HR_ADMIN"] } } } });
  const employeeUsers = await prisma.user.findMany({ where: { role: { name: "EMPLOYEE" } } });

  for (let i = 1; i <= 100; i++) {
    const firstName = `Emp${i}`;
    const lastName = `User${i}`;
    const user = i <= employeeUsers.length ? employeeUsers[i - 1] : null;
    const dept = deptRows[i % deptRows.length];
    const desig = desigRows[i % desigRows.length];
    const manager = managerUsers[i % managerUsers.length];

    const employee = await prisma.employee.upsert({
      where: { employeeCode: `PF${String(i).padStart(4, "0")}` },
      update: {},
      create: {
        employeeCode: `PF${String(i).padStart(4, "0")}`,
        userId: user?.id,
        firstName,
        lastName,
        personalEmail: `emp${i}@peopleflow.local`,
        phone: `900000${String(i).padStart(4, "0")}`,
        joiningDate: new Date(2025, i % 12, (i % 26) + 1),
        employmentType: "FULL_TIME",
        departmentId: dept.id,
        designationId: desig.id,
        workLocationId: locationRows[i % locationRows.length].id,
        managerId: undefined,
        salaryMonthly: 35000 + i * 1500,
        skills: ["Communication", "Excel", "HRMS", `Skill${i}`]
      }
    });

    for (const lt of leaveRows) {
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: lt.id, year: 2026 } },
        update: {},
        create: { employeeId: employee.id, leaveTypeId: lt.id, year: 2026, allocated: lt.annualQuota, used: i % 3 }
      });
    }

    await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: employee.id, date: new Date(2026, 2, 9) } },
      update: {},
      create: {
        employeeId: employee.id,
        date: new Date(2026, 2, 9),
        checkIn: new Date(2026, 2, 9, 9, 15),
        checkOut: new Date(2026, 2, 9, 18, 2),
        status: i % 7 === 0 ? "HALF_DAY" : "PRESENT",
        workMinutes: 510
      }
    });
  }

  const dep = deptRows[0];
  const reqIds: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const req = await prisma.jobRequisition.create({
      data: {
        title: `Hiring Requisition ${i}`,
        departmentId: dep.id,
        employmentType: "FULL_TIME",
        status: "APPROVED",
        budgetMin: 600000,
        budgetMax: 1200000,
        location: "Bengaluru"
      }
    });
    reqIds.push(req.id);
  }

  const recruiters = await prisma.user.findMany({ where: { role: { name: "RECRUITER" } } });
  const openings: string[] = [];
  for (let i = 0; i < reqIds.length; i++) {
    const opening = await prisma.jobOpening.create({
      data: {
        requisitionId: reqIds[i],
        title: `Software Role ${i + 1}`,
        description: "Build scalable products in a fast-growing SaaS platform.",
        locationId: locationRows[0].id,
        recruiterId: recruiters[i % recruiters.length]?.id,
        openingsCount: 2,
        status: "OPEN",
        publishedAt: new Date(2026, 1, i + 1)
      }
    });
    openings.push(opening.id);
  }

  const stages: CandidateStage[] = ["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "OFFERED", "JOINED", "REJECTED", "ON_HOLD"];
  const sources: CandidateSource[] = ["CAREERS_PORTAL", "REFERRAL", "LINKEDIN", "JOB_BOARD", "DIRECT", "AGENCY"];

  for (let i = 1; i <= 20; i++) {
    await prisma.candidate.create({
      data: {
        jobOpeningId: openings[i % openings.length],
        fullName: `Candidate ${i}`,
        email: `candidate${i}@mail.com`,
        phone: `800000${String(i).padStart(4, "0")}`,
        currentLocation: i % 2 === 0 ? "Bengaluru" : "Mumbai",
        noticePeriodDays: 30 + (i % 3) * 15,
        totalExperience: 1 + (i % 8),
        skills: ["React", "Node", `Skill${i}`],
        education: "B.Tech",
        stage: stages[i % stages.length],
        source: sources[i % sources.length],
        rating: (i % 5) + 1,
        assignedRecruiterId: recruiters[i % recruiters.length]?.id,
        duplicateHash: `seed-${i}`,
        activity: { create: [{ action: "Application received" }, { action: "Profile reviewed" }] }
      }
    });
  }

  const employees = await prisma.employee.findMany({ take: 10 });
  const run = await prisma.payrollRun.upsert({
    where: { month_year: { month: 2, year: 2026 } },
    update: { status: "COMPLETED" },
    create: { month: 2, year: 2026, status: "COMPLETED" }
  });

  for (const e of employees) {
    const item = await prisma.payrollItem.create({
      data: {
        payrollRunId: run.id,
        employeeId: e.id,
        grossPay: e.salaryMonthly,
        deductions: Number(e.salaryMonthly) * 0.12,
        netPay: Number(e.salaryMonthly) * 0.88
      }
    });
    await prisma.payslip.create({ data: { employeeId: e.id, payrollItemId: item.id, month: 2, year: 2026, pdfPath: `/payslips/${e.employeeCode}-2026-02.pdf` } });
  }

  for (const user of await prisma.user.findMany()) {
    await prisma.notification.create({ data: { userId: user.id, title: "Welcome to PeopleFlow HR", body: "Your account is ready." } });
  }

  await prisma.announcement.createMany({
    data: [
      { title: "Quarterly Townhall", content: "Townhall is scheduled for March 20." },
      { title: "Payroll processing", content: "Payroll closes on March 28." }
    ]
  });

  const perfCycle = await prisma.performanceCycle.create({
    data: {
      name: "Q1 2026 Review",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
      status: "ACTIVE"
    }
  });
  const perfEmployees = await prisma.employee.findMany({ take: 12 });
  for (const employee of perfEmployees) {
    await prisma.performanceGoal.create({
      data: {
        employeeId: employee.id,
        cycleId: perfCycle.id,
        title: "Role KPI achievement",
        description: "Meet quarterly KPI scorecard",
        targetValue: 100,
        weight: 20
      }
    });
    await prisma.performanceReview.create({
      data: {
        employeeId: employee.id,
        cycleId: perfCycle.id,
        selfRating: 4,
        managerRating: 4,
        notes: "Consistent and reliable output."
      }
    });
  }

  console.log("Seed complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

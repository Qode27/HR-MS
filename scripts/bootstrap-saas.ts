import bcrypt from "bcryptjs";
import { PrismaClient, RoleName } from "@prisma/client";
import { ROLE_PERMISSIONS } from "../src/lib/constants";

const prisma = new PrismaClient();

async function upsertPermissions(roleName: RoleName) {
  const role = await prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName, description: `${roleName} role` }
  });
  const permissions = ROLE_PERMISSIONS[roleName] || [];
  for (const key of permissions) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key.replace(":", " ") }
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id }
    });
  }
  return role;
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "peopleflow-demo" },
    update: { status: "ACTIVE" },
    create: {
      id: "tenant_default_peopleflow",
      name: "PeopleFlow Demo Client",
      slug: "peopleflow-demo",
      legalName: "PeopleFlow Demo Client Pvt Ltd",
      employeeLimit: 1000,
      monthlyPrice: 49999,
      status: "ACTIVE"
    }
  });

  const plan = await prisma.subscriptionPlan.upsert({
    where: { name: "Enterprise" },
    update: { active: true },
    create: {
      id: "plan_enterprise",
      name: "Enterprise",
      monthlyPrice: 49999,
      employeeLimit: 1000,
      features: { ats: true, payroll: true, documents: true, reports: true }
    }
  });

  const now = new Date();
  const currentPeriodEnd = new Date(now);
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
  await prisma.tenantSubscription.upsert({
    where: { id: "sub_default_peopleflow" },
    update: { tenantId: tenant.id, planId: plan.id, status: "ACTIVE", mrr: plan.monthlyPrice },
    create: {
      id: "sub_default_peopleflow",
      tenantId: tenant.id,
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd,
      mrr: plan.monthlyPrice
    }
  });

  for (const roleName of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
    await upsertPermissions(roleName);
  }

  const passwordHash = await bcrypt.hash("Admin@123", 12);
  const masterRole = await prisma.role.findUniqueOrThrow({ where: { name: "MASTER_ADMIN" } });
  await prisma.user.upsert({
    where: { email: "master@peopleflow.local" },
    update: { fullName: "Platform Owner", roleId: masterRole.id, tenantId: null, passwordHash },
    create: {
      email: "master@peopleflow.local",
      fullName: "Platform Owner",
      roleId: masterRole.id,
      tenantId: null,
      passwordHash
    }
  });

  await prisma.user.updateMany({ where: { tenantId: null, role: { name: { not: "MASTER_ADMIN" } } }, data: { tenantId: tenant.id } });
  await prisma.department.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } });
  await prisma.designation.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } });
  await prisma.workLocation.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } });
  await prisma.employee.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } });
  await prisma.attendance.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } });
  await prisma.leaveType.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } });
  await prisma.payrollRun.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } });
  await prisma.document.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } });
  await prisma.jobRequisition.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } });
  await prisma.jobOpening.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } });
  await prisma.candidate.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } });
  await prisma.announcement.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } });
  await prisma.organizationSetting.updateMany({ where: { tenantId: null }, data: { tenantId: tenant.id } });

  console.log("SaaS bootstrap complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

DO $$ BEGIN
  ALTER TYPE "RoleName" ADD VALUE IF NOT EXISTS 'MASTER_ADMIN';
  ALTER TYPE "RoleName" ADD VALUE IF NOT EXISTS 'ADMIN';
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentScope" AS ENUM ('COMPANY', 'EMPLOYEE', 'CANDIDATE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "legalName" TEXT,
  "domain" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Calcutta',
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "employeeCap" INTEGER NOT NULL DEFAULT 250,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX IF NOT EXISTS "Tenant_status_idx" ON "Tenant"("status");

CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "monthlyPrice" DECIMAL(12,2) NOT NULL,
  "employeeLimit" INTEGER NOT NULL,
  "features" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");

CREATE TABLE IF NOT EXISTS "TenantSubscription" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "billingEmail" TEXT,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "mrr" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TenantSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TenantSubscription_tenantId_status_idx" ON "TenantSubscription"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "TenantSubscription_status_idx" ON "TenantSubscription"("status");

CREATE TABLE IF NOT EXISTS "PlatformAlert" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "severity" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformAlert_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PlatformAlert_tenantId_resolvedAt_idx" ON "PlatformAlert"("tenantId", "resolvedAt");
CREATE INDEX IF NOT EXISTS "PlatformAlert_severity_resolvedAt_idx" ON "PlatformAlert"("severity", "resolvedAt");

CREATE TABLE IF NOT EXISTS "TimesheetEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "employeeId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "project" TEXT NOT NULL,
  "task" TEXT NOT NULL,
  "hours" DECIMAL(5,2) NOT NULL,
  "notes" TEXT,
  "status" "TimesheetStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "managerId" TEXT,
  "managerDecisionAt" TIMESTAMP(3),
  "managerNote" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "payrollRunId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimesheetEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TimesheetEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TimesheetEntry_tenantId_date_idx" ON "TimesheetEntry"("tenantId", "date");
CREATE INDEX IF NOT EXISTS "TimesheetEntry_employeeId_weekStart_idx" ON "TimesheetEntry"("employeeId", "weekStart");
CREATE INDEX IF NOT EXISTS "TimesheetEntry_status_idx" ON "TimesheetEntry"("status");

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Designation" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WorkLocation" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "LeaveType" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "folder" TEXT NOT NULL DEFAULT 'General';
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "scope" "DocumentScope" NOT NULL DEFAULT 'EMPLOYEE';
ALTER TABLE "JobRequisition" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "JobOpening" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "OrganizationSetting" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX IF NOT EXISTS "Department_tenantId_idx" ON "Department"("tenantId");
CREATE INDEX IF NOT EXISTS "Designation_tenantId_idx" ON "Designation"("tenantId");
CREATE INDEX IF NOT EXISTS "WorkLocation_tenantId_idx" ON "WorkLocation"("tenantId");
CREATE INDEX IF NOT EXISTS "Employee_tenantId_idx" ON "Employee"("tenantId");
CREATE INDEX IF NOT EXISTS "Attendance_tenantId_date_idx" ON "Attendance"("tenantId", "date");
CREATE INDEX IF NOT EXISTS "LeaveType_tenantId_idx" ON "LeaveType"("tenantId");
CREATE INDEX IF NOT EXISTS "PayrollRun_tenantId_year_month_idx" ON "PayrollRun"("tenantId", "year", "month");
DROP INDEX IF EXISTS "PayrollRun_month_year_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PayrollRun_tenantId_month_year_key" ON "PayrollRun"("tenantId", "month", "year");
CREATE INDEX IF NOT EXISTS "Document_tenantId_scope_idx" ON "Document"("tenantId", "scope");
CREATE INDEX IF NOT EXISTS "JobRequisition_tenantId_status_idx" ON "JobRequisition"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "JobOpening_tenantId_status_idx" ON "JobOpening"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Candidate_tenantId_stage_idx" ON "Candidate"("tenantId", "stage");
CREATE INDEX IF NOT EXISTS "Announcement_tenantId_publishedAt_idx" ON "Announcement"("tenantId", "publishedAt");
CREATE INDEX IF NOT EXISTS "OrganizationSetting_tenantId_idx" ON "OrganizationSetting"("tenantId");

INSERT INTO "Tenant" ("id", "name", "slug", "legalName", "status", "timezone", "currency", "employeeCap")
VALUES ('tenant_default_peopleflow', 'PeopleFlow Client', 'peopleflow', 'PeopleFlow Client Pvt Ltd', 'ACTIVE', 'Asia/Calcutta', 'INR', 1000)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "SubscriptionPlan" ("id", "name", "monthlyPrice", "employeeLimit", "features")
VALUES ('plan_enterprise', 'Enterprise', 49999.00, 1000, '{"ats":true,"payroll":true,"documents":true,"reports":true}'::jsonb)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "TenantSubscription" ("id", "tenantId", "planId", "status", "currentPeriodStart", "currentPeriodEnd", "mrr")
VALUES ('sub_default_peopleflow', 'tenant_default_peopleflow', 'plan_enterprise', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 month', 49999.00)
ON CONFLICT ("id") DO NOTHING;

UPDATE "User" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;
UPDATE "Department" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;
UPDATE "Designation" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;
UPDATE "WorkLocation" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;
UPDATE "Employee" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;
UPDATE "Attendance" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;
UPDATE "LeaveType" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;
UPDATE "PayrollRun" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;
UPDATE "Document" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;
UPDATE "JobRequisition" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;
UPDATE "JobOpening" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;
UPDATE "Candidate" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;
UPDATE "Announcement" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;
UPDATE "OrganizationSetting" SET "tenantId" = 'tenant_default_peopleflow' WHERE "tenantId" IS NULL;

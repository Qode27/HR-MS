-- Explicit salary type for system-driven payroll calculations.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SalaryType') THEN
    CREATE TYPE "SalaryType" AS ENUM ('FIXED', 'HOURLY');
  END IF;
END $$;

ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "salaryType" "SalaryType" NOT NULL DEFAULT 'FIXED';

UPDATE "Employee"
SET "salaryType" = 'HOURLY'
WHERE "perHourRate" IS NOT NULL AND "perHourRate" > 0;

UPDATE "Employee"
SET "salaryType" = 'FIXED'
WHERE "salaryType" IS NULL;

CREATE INDEX IF NOT EXISTS "Employee_tenantId_salaryType_idx" ON "Employee"("tenantId", "salaryType");

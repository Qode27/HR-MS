-- Normalize timesheets into a draft/submitted/approved workflow for payroll.
ALTER TABLE "Timesheet"
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);

ALTER TABLE "Timesheet"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

UPDATE "Timesheet"
SET "status" = 'SUBMITTED',
    "submittedAt" = COALESCE("submittedAt", "createdAt")
WHERE "status" = 'PENDING';

UPDATE "Timesheet"
SET "submittedAt" = COALESCE("submittedAt", "createdAt")
WHERE "status" IN ('SUBMITTED', 'APPROVED', 'REJECTED');

CREATE INDEX IF NOT EXISTS "Timesheet_tenantId_userId_date_idx" ON "Timesheet"("tenantId", "userId", "date");
CREATE INDEX IF NOT EXISTS "Timesheet_tenantId_status_date_idx" ON "Timesheet"("tenantId", "status", "date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Timesheet_hoursWorked_range_check'
  ) THEN
    ALTER TABLE "Timesheet"
      ADD CONSTRAINT "Timesheet_hoursWorked_range_check"
      CHECK ("hoursWorked" > 0 AND "hoursWorked" <= 24);
  END IF;
END $$;

ALTER TYPE "PayrollStatus" ADD VALUE IF NOT EXISTS 'RUNNING';

ALTER TABLE "PayrollRun"
  ADD COLUMN IF NOT EXISTS "periodStart" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "periodEnd" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "runByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "runAt" TIMESTAMP(3);

UPDATE "PayrollRun"
SET
  "periodStart" = make_date("year", "month", 1)::timestamp,
  "periodEnd" = (make_date("year", "month", 1) + INTERVAL '1 month' - INTERVAL '1 millisecond')::timestamp
WHERE "periodStart" IS NULL OR "periodEnd" IS NULL;

ALTER TABLE "Timesheet"
  ADD COLUMN IF NOT EXISTS "payrollRunId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Timesheet_payrollRunId_fkey'
  ) THEN
    ALTER TABLE "Timesheet"
      ADD CONSTRAINT "Timesheet_payrollRunId_fkey"
      FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PayrollRun_tenantId_periodStart_periodEnd_idx"
  ON "PayrollRun"("tenantId", "periodStart", "periodEnd");

CREATE INDEX IF NOT EXISTS "Timesheet_payrollRunId_idx"
  ON "Timesheet"("payrollRunId");

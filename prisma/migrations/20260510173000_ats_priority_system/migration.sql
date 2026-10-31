DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CandidatePriority') THEN
    CREATE TYPE "CandidatePriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
  END IF;
END $$;

ALTER TABLE "Candidate"
  ADD COLUMN IF NOT EXISTS "priority" "CandidatePriority" NOT NULL DEFAULT 'LOW';

UPDATE "Candidate"
SET "priority" = CASE
  WHEN "stage" IN ('INTERVIEW_SCHEDULED', 'INTERVIEWED', 'SELECTED', 'OFFERED') THEN 'HIGH'::"CandidatePriority"
  WHEN "updatedAt" < NOW() - INTERVAL '5 days' AND "stage" NOT IN ('JOINED', 'REJECTED') THEN 'HIGH'::"CandidatePriority"
  WHEN "stage" IN ('SCREENING', 'SHORTLISTED', 'ON_HOLD') THEN 'MEDIUM'::"CandidatePriority"
  ELSE 'LOW'::"CandidatePriority"
END;

CREATE INDEX IF NOT EXISTS "Candidate_tenantId_priority_idx" ON "Candidate"("tenantId", "priority");

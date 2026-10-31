ALTER TABLE "Candidate"
  ADD COLUMN IF NOT EXISTS "nextAction" TEXT,
  ADD COLUMN IF NOT EXISTS "nextActionDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "resumeText" TEXT;

CREATE INDEX IF NOT EXISTS "Candidate_tenantId_jobOpeningId_idx" ON "Candidate"("tenantId", "jobOpeningId");
CREATE INDEX IF NOT EXISTS "Candidate_tenantId_assignedRecruiterId_idx" ON "Candidate"("tenantId", "assignedRecruiterId");
CREATE INDEX IF NOT EXISTS "Candidate_tenantId_createdAt_idx" ON "Candidate"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Candidate_tenantId_updatedAt_idx" ON "Candidate"("tenantId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Candidate_tenantId_nextActionDate_idx" ON "Candidate"("tenantId", "nextActionDate");
CREATE INDEX IF NOT EXISTS "Candidate_email_idx" ON "Candidate"("email");
CREATE INDEX IF NOT EXISTS "Candidate_phone_idx" ON "Candidate"("phone");

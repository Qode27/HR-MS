# Phase 6 - ATS / Recruitment Module

## Audit Findings
- Candidate detail API routes for `[id]` workflows were missing.
- Pipeline stages were hardcoded in UI.
- Candidate notes and interview scheduling lacked dedicated APIs.
- Interview page was placeholder-only.

## Implemented

### ATS APIs
- Added candidate detail and stage mutation:
  - `GET/PATCH /api/ats/candidates/[id]`
- Added candidate comments:
  - `POST /api/ats/candidates/[id]/comments`
- Restored candidate conversion route:
  - `POST /api/ats/candidates/[id]/convert`
- Added job detail route:
  - `GET /api/ats/jobs/[id]`
- Added configurable stage APIs:
  - `GET/PUT /api/ats/stages`
- Added interview APIs:
  - `GET/POST /api/ats/interviews`

### ATS UI
- Pipeline now uses backend-configured stages instead of hardcoded columns.
- Candidate detail now includes:
  - profile summary cards
  - recruiter notes/comments
  - interview scheduling form
  - timeline activity
- Interviews page now lists real scheduled interviews.

### Files Updated (Phase 6)
- `src/app/api/ats/candidates/[id]/route.ts`
- `src/app/api/ats/candidates/[id]/comments/route.ts`
- `src/app/api/ats/candidates/[id]/convert/route.ts`
- `src/app/api/ats/jobs/[id]/route.ts`
- `src/app/api/ats/stages/route.ts`
- `src/app/api/ats/interviews/route.ts`
- `frontend/components/ats-kanban.tsx`
- `frontend/services/hrms-api.ts`
- `src/app/(dashboard)/ats/candidates/pipeline/page.tsx`
- `src/app/(dashboard)/ats/candidates/[id]/page.tsx`
- `src/app/(dashboard)/ats/interviews/page.tsx`

## Validation
- Test suite remains green.

## Phase 6 Outcome
- ATS now supports configurable pipeline stages, actionable candidate profiles, and real interview scheduling workflows.

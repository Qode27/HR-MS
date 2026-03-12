# Phase 7 - Candidate-to-Employee Onboarding Flow

## Implemented
- Improved candidate conversion endpoint with optional overrides:
  - `departmentId`, `designationId`, `managerId`, `workLocationId`, `joiningDate`, `salaryMonthly`
- Added onboarding task status lifecycle endpoint:
  - `POST /api/onboarding/[id]/status`
- Refactored onboarding listing endpoint to guarded API envelope.
- Upgraded onboarding UI with actionable task state transitions (Todo/In Progress/Blocked/Done).

## Files
- `src/app/api/ats/candidates/[id]/convert/route.ts`
- `src/app/api/onboarding/route.ts`
- `src/app/api/onboarding/[id]/status/route.ts`
- `src/app/(dashboard)/onboarding/page.tsx`

## Outcome
- Hired candidates now transition into operational onboarding with manageable task lifecycle.

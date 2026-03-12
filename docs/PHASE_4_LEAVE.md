# Phase 4 - Leave Management

## Audit Findings
- Leave flow was self-request only with no robust approval chain.
- No overlap validation.
- No balance-safe final approval behavior.
- No manager/HR approval queue visibility.
- Leave UI used raw leave type IDs and lacked workflow context.

## Implemented

### Leave Engine
- Added `backend/services/leave.service.ts` with:
  - self dashboard data
  - approval queue for Manager and HR/Admin
  - leave apply workflow with:
    - date validation
    - overlap prevention
    - max duration control
    - leave balance checks
  - multi-step approval chain:
    - Manager stage -> HR stage -> Final approval
    - rejection handling at each stage
  - leave balance deduction only at final HR approval

### Leave APIs
- Refactored `GET/POST /api/leave` to use service-driven workflow.
- Added `POST /api/leave/[id]/decision` for approval/rejection.

### Leave UI
- Leave dashboard now includes approval queue with approve/reject controls.
- Request cards now show workflow stage.
- Apply leave page now uses leave type dropdown and proper submit feedback/loading.

### Validation
- Strengthened `leaveApplySchema` with date-order refinement.
- Added tests for valid/invalid leave date ranges.

## Files Updated (Phase 4)
- `backend/services/leave.service.ts`
- `src/app/api/leave/route.ts`
- `src/app/api/leave/[id]/decision/route.ts`
- `src/app/(dashboard)/leave/page.tsx`
- `src/app/(dashboard)/leave/apply/page.tsx`
- `src/lib/validators/schemas.ts`
- `tests/leave-schema.test.ts`

## Validation
- Test suite remains green.

## Phase 4 Outcome
- Leave now behaves like a real workflow with policy-safe requests, staged approvals, and balance integrity.

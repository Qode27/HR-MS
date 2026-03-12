# Phase 5 - Payroll Module

## Audit Findings
- Payroll run logic was hardcoded in route handlers.
- No centralized formula model.
- No clear run finalization flow.
- Payslip details lacked gross/deductions/net visibility in UI.

## Implemented

### Payroll Engine Service
- Added `backend/services/payroll.service.ts` with:
  - centralized formula retrieval (`organizationSetting: payroll.formula`)
  - payroll run creation and re-processing for non-finalized periods
  - per-employee payroll item generation
  - auto payslip record generation
  - summary totals persistence in `summaryJson`
  - run finalization/lock behavior
  - employee self payslip retrieval

### Payroll APIs
- Refactored:
  - `GET/POST /api/payroll/runs`
  - `GET /api/payroll/payslips`
- Added:
  - `POST /api/payroll/runs/[id]/finalize`

### Payroll UI
- Payroll dashboard now includes:
  - run summary cards
  - run table with employees/net paid
  - finalize action per run
- Payslips page now shows gross/deductions/net columns.

## Files Updated (Phase 5)
- `backend/services/payroll.service.ts`
- `src/app/api/payroll/runs/route.ts`
- `src/app/api/payroll/runs/[id]/finalize/route.ts`
- `src/app/api/payroll/payslips/route.ts`
- `src/app/(dashboard)/payroll/page.tsx`
- `src/app/(dashboard)/payroll/payslips/page.tsx`

## Validation
- Test suite remains green.

## Phase 5 Outcome
- Payroll now uses centralized business logic, finalized run controls, and clearer operational UI.

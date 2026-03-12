# Phase 8 - Performance Management

## Implemented
- Added goal creation API:
  - `POST /api/performance/goals`
- Added review APIs:
  - `GET /api/performance/reviews`
  - `POST /api/performance/reviews`
- Added role-aware submission rules:
  - Employee can submit own self review.
  - Manager can submit manager rating for team members.
  - HR/Admin can submit/override review values.
- Upgraded performance page with:
  - cycle creation
  - goal assignment form
  - review submission form
  - recent reviews list

## Files
- `src/app/api/performance/goals/route.ts`
- `src/app/api/performance/reviews/route.ts`
- `src/app/(dashboard)/performance/page.tsx`

## Outcome
- Performance workflows are now actionable (cycles + goals + review submissions).

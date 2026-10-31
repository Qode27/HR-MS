# Post-Fix QA Report: HRMS Client Module and Role System

Date: 2026-05-07
Environment: Local Next.js app at `http://localhost:3000`, Supabase Postgres via Prisma

## Summary

Strict QA was completed for the Client Module, role-based navigation, frontend route protection, API authorization, and broken-state regressions.

Result: PASS after two targeted fixes.

## Fixes Applied During QA

### 1. Master dashboard Add New Client action used stale route

- Issue: `Add New Client` returned `/settings?tab=clients` instead of the production Clients module.
- Impact: Master Admin dashboard action could lead to the wrong client flow.
- File: `backend/services/dashboard.service.ts`
- Fix: Changed quick action href to `/clients`.
- Re-test evidence: `/api/dashboard/summary` as MASTER_ADMIN now returns `Add New Client -> /clients`.

### 2. Legacy Settings client creation bypassed ClientService

- Issue: `/api/tenants` still had a separate tenant creation path and could create incomplete client records.
- Impact: Duplicate SaaS onboarding path risked inconsistent tenant/client data.
- Files:
  - `src/app/api/tenants/route.ts`
  - `src/app/(dashboard)/settings/page.tsx`
- Fix: `/api/tenants` POST now delegates to `ClientService.create`, and Settings collects contact phone instead of inventing data.
- Re-test evidence: legacy POST `/api/tenants` returned `201`, created contact phone correctly, then cleanup soft delete returned `200`.

## Passed Items

### MASTER_ADMIN

- Login succeeded with `master@peopleflow.local / Admin@123`.
- Dashboard scope: `platform`.
- Platform metrics returned:
  - clients: `1`
  - activeClients: `1`
  - employees: `107`
  - monthlyRevenue: `49999`
- `/clients` route returned `200`.
- Client CRUD flow passed:
  - Create client: `201`
  - Initial SUPER_ADMIN temporary credential returned: yes
  - Created client appeared in list: yes
  - Dashboard client count changed from `1` to `2`
  - Edit client persisted phone/limit changes
  - Suspend returned `SUSPENDED`
  - Reactivate returned `ACTIVE`
  - Soft delete returned `200`
  - Deleted client hidden from active list: yes, filtered count `0`

### SUPER_ADMIN

- Login succeeded with `admin@peopleflow.local / Admin@123`.
- Role returned: `SUPER_ADMIN`.
- Tenant ID returned: `tenant_default_peopleflow`.
- `/clients` manually opened: `307 -> /dashboard`.
- Company dashboard scope returned: `company`.
- Company metrics only returned; no platform/client revenue scope exposed.
- Allowed routes passed:
  - `/dashboard`: `200`
  - `/employees`: `200`
  - `/payroll`: `200`
  - `/ats`: `200`
  - `/documents`: `200`
  - `/reports`: `200`
  - `/settings`: `200`
  - `/profile`: `200`

### EMPLOYEE

- Login succeeded with `employee@peopleflow.local / Admin@123`.
- Role returned: `EMPLOYEE`.
- Employee dashboard scope returned: `self`.
- Employee metrics returned only personal data:
  - timesheetHours: `2`
  - pendingLeaves: `0`
  - payslips: `2`
  - documents: `0`
- Forbidden routes passed:
  - `/clients`: `307 -> /dashboard`
  - `/payroll`: `307 -> /dashboard`
  - `/ats`: `307 -> /dashboard`
- Allowed employee routes passed:
  - `/dashboard`: `200`
  - `/my-timesheets`: `307 -> /attendance?mine=1`
  - `/leave`: `200`
  - `/documents`: `200`
  - `/payroll/payslips`: `200`
  - `/profile`: `200`

### API Authorization

- `GET /api/clients` as MASTER_ADMIN: `200`
- `GET /api/clients` as SUPER_ADMIN: `403`
- `GET /api/clients` as EMPLOYEE: `403`
- `GET /api/payroll/runs` as EMPLOYEE: `403`
- `GET /api/ats/jobs` as EMPLOYEE: `403`
- Tenant isolation check: non-master users cannot access `/api/clients`; tenant-scoped dashboards return `company` or `self`, not `platform`.

### Sidebar and Route Mapping

- No route evidence of Clients opening Settings.
- MASTER_ADMIN `/clients`: `200`
- SUPER_ADMIN `/clients`: `307 -> /dashboard`
- EMPLOYEE `/clients`: `307 -> /dashboard`
- Timesheet aliases route to the existing timesheet workspace:
  - SUPER_ADMIN `/timesheets`: `307 -> /attendance`
  - EMPLOYEE `/my-timesheets`: `307 -> /attendance?mine=1`

### Broken-State Scan

- Search for `Demo endpoint not implemented`: no matches.
- Search for stale `/settings?tab=clients`: no matches after fix.
- Search for `href="#"` and empty `onClick={() => {}}`: no matches.
- Reports catalog check: all defined report keys returned `200`.
- Remaining `Loading...` strings are transient loading states in profile/detail/report/settings pages, not permanent dashboard-card states.

## Failed Items

No blocking failures remain after the two fixes above.

## Screenshots / Issues Found

Screenshots were not captured. The available `agent-browser` command was not installed, and an attempted Playwright smoke spec could not run because the repo does not include `@playwright/test`. I did not add a new QA dependency because the request was post-fix verification, not test tooling expansion.

Issues found and fixed:

1. `backend/services/dashboard.service.ts`: stale Master Admin quick action path.
2. `src/app/api/tenants/route.ts`: stale tenant creation path bypassing the production client service.
3. `src/app/(dashboard)/settings/page.tsx`: missing contact phone field for legacy client onboarding.

## Validation Commands

- `npx tsc --noEmit`: passed
- `npm run build`: passed
- `npx prisma db push`: previously completed during implementation; no additional schema change was needed during this QA pass.

## Recommended Fix Order

No immediate blocking fixes remain.

Recommended next hardening work:

1. Add a local Playwright setup for repeatable browser screenshots and sidebar assertions.
2. Replace remaining text-based `Loading...` states in profile/detail pages with skeletons for consistency.
3. Consolidate Settings client onboarding into a link to `/clients` if you want one single client-management surface.

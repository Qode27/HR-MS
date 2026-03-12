# PeopleFlow HR (Enterprise Refactor)

Production-ready HRMS + ATS built with Next.js, Prisma, and PostgreSQL.

## Enterprise Refactor Highlights
- Layered architecture with clear separation of concerns:
  - `backend/controllers`, `backend/services`, `backend/repositories`, `backend/middleware`, `backend/utils`
  - `frontend/components`, `frontend/hooks`, `frontend/services`, `frontend/styles`
- Unified API envelope and guarded error handling (`withApiGuard`)
- JWT auth with RBAC + API rate limiting
- Structured file logging:
  - `logs/app.log`
  - `logs/error.log`
  - `logs/security.log`
- ATS upgraded with drag-and-drop Kanban stage transitions
- Dashboard optimized with cache revalidation
- Employee listing supports pagination metadata
- Reports export endpoint:
  - `/api/reports/export?format=csv`
  - `/api/reports/export?format=xlsx`

## Modules
- Auth & RBAC (Admin, HR, Manager, Employee, Recruiter)
- Dashboard analytics widgets
- Employee directory + profile + create
- Attendance + Leave + Payroll basics
- ATS jobs/candidates/pipeline/conversion
- Onboarding tracker
- Documents center
- Reports and exports
- Settings bootstrap + notifications

## Stack
- Next.js 15, TypeScript, Tailwind, Framer Motion
- Prisma + PostgreSQL
- Zod validation, Zustand state
- Recharts and table utilities
- Vitest tests

## Setup
1. Copy env:
```bash
cp .env.example .env
```
2. Set credentials in `.env`.
3. Install:
```bash
npm.cmd install
```
4. Migrate + seed:
```bash
npx.cmd prisma migrate dev --name init
npm.cmd run db:seed
```
5. Start:
```bash
npm.cmd run dev
```

## Production
- `.env.production` template included
- Dockerfile + docker-compose included
- Deployment guidance in `deployment/README.md`

## Test
```bash
npm.cmd run test
```

## Demo Credentials
- Super Admin: `admin@peopleflow.local` / `Admin@123`
- HR Admin: `hr@peopleflow.local` / `Admin@123`
- Recruiter: `recruiter1@peopleflow.local` / `Admin@123`
- Manager: `manager1@peopleflow.local` / `Admin@123`
- Employee: `employee@peopleflow.local` / `Admin@123`

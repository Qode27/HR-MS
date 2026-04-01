# PeopleFlow HR

PeopleFlow HR is a Next.js 15 HRMS + ATS application backed by Prisma and PostgreSQL. It includes authentication, role-based access control, employee management, attendance, leave, payroll, recruitment, onboarding, reports, and document workflows.

## Features

- JWT authentication with RBAC
- Employee directory, profile, and creation flows
- Attendance and regularization workflows
- Leave requests and approval decisions
- Payroll runs and payslips
- ATS jobs, candidates, interviews, pipeline, and candidate conversion
- Onboarding task tracking
- Reports overview and CSV/XLSX export
- Notifications, settings bootstrap, and audit logging

## Tech Stack

- Next.js 15
- React 18
- TypeScript
- Prisma
- PostgreSQL
- Redis
- Tailwind CSS
- Zod
- Vitest

## Project Structure

- `src/app` : App Router pages and API routes
- `src/components` : shared UI and layout components
- `src/lib` : auth, database, services, utilities, validators
- `backend` : middleware, controllers, services, repositories, utilities
- `prisma` : schema, migrations, and seed script
- `docker-compose.yml` : app, PostgreSQL, and Redis services
- `Dockerfile` : production container build

## Environment Variables

Example local development values are in [`.env.example`](/home/vaibhav/qode27/wasif/hrms/HR-MS/.env.example).

### Local development

Use [`.env`](/home/vaibhav/qode27/wasif/hrms/HR-MS/.env):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/peopleflow_hr?schema=public"
JWT_SECRET="replace-with-strong-secret"
FILE_STORAGE_PATH="uploads"
NEXT_PUBLIC_APP_NAME="PeopleFlow HR"
NODE_ENV="development"
REDIS_URL="redis://localhost:6379"
```

### Docker / container runtime

Use [`.env.production`](/home/vaibhav/qode27/wasif/hrms/HR-MS/.env.production):

```env
DATABASE_URL="postgresql://postgres:postgres@db:5432/peopleflow_hr?schema=public"
JWT_SECRET="strong-production-secret"
FILE_STORAGE_PATH="uploads"
NEXT_PUBLIC_APP_NAME="PeopleFlow HR"
NODE_ENV="production"
REDIS_URL="redis://redis:6379"
```

When the app runs inside Docker, use the Compose service names like `db` and `redis`, not `localhost`.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Make sure PostgreSQL is available on `localhost:5432`.

4. Generate Prisma client:

```bash
npm run db:generate
```

5. Run migrations:

```bash
npm run db:migrate
```

6. Seed the database:

```bash
npm run db:seed
```

7. Start the app:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Docker Setup

Start the full stack with Docker Compose:

```bash
docker compose up --build
```

This starts:

- `app` on `http://localhost:3000`
- `db` on `localhost:5432`
- `redis` on `localhost:6379`

Notes:

- The app service loads env vars from [`.env.production`](/home/vaibhav/qode27/wasif/hrms/HR-MS/.env.production) using `env_file`.
- On container startup, `npm run start` runs `prisma migrate deploy` and then `next start`.
- Uploaded files are mounted to `./uploads`.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run test
npm run test:unit
npm run test:watch
npm run db:generate
npm run db:migrate
npm run db:seed
npm run bootstrap:logs
```

## Build Notes

- `npm run build` runs `prisma generate && next build`
- The app is configured to render on demand at runtime, which avoids static build issues for runtime-dependent authenticated pages

## Demo Credentials

- Super Admin: `admin@peopleflow.local` / `Admin@123`
- HR Admin: `hr@peopleflow.local` / `Admin@123`
- Recruiter: `recruiter1@peopleflow.local` / `Admin@123`
- Manager: `manager1@peopleflow.local` / `Admin@123`
- Employee: `employee@peopleflow.local` / `Admin@123`

## Troubleshooting

- `Environment variable not found: DATABASE_URL`
  Use `env_file` in Docker Compose and make sure the app container receives [`.env.production`](/home/vaibhav/qode27/wasif/hrms/HR-MS/.env.production).

- App inside Docker cannot reach PostgreSQL
  Use `db:5432` in `DATABASE_URL`, not `localhost:5432`.

- App on host machine cannot reach PostgreSQL container
  Use `localhost:5432` in [`.env`](/home/vaibhav/qode27/wasif/hrms/HR-MS/.env).

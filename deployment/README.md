# Deployment Targets

## Vercel
- Build command: `npm run build`
- Install command: `npm ci`
- Required env: `DATABASE_URL`, `JWT_SECRET`

## AWS / Azure / DigitalOcean
- Use root `Dockerfile`.
- Set reverse proxy and TLS termination.
- Mount `uploads/` or replace storage adapter with object storage.

## Azure Web App (current live target)
- App Service: `hrms-260324`
- Runtime: `NODE|20-lts`
- Startup command: `HOSTNAME=0.0.0.0 node server.js`
- Deploy with source zip build on App Service or a standalone artifact.
- Required app settings:
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `TENANT_SCHEMA`
  - `JWT_SECRET`
  - `FILE_STORAGE_PATH=/home/site/uploads`
- Health checks:
  - `/api/health`
  - `/api/health/readiness`
- Notes:
  - This app uses Next.js standalone output for App Service startup.
  - Employee and admin document files are stored on local App Service storage; move to object storage later if multi-instance scale is needed.

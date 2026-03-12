# Deployment Targets

## Vercel
- Build command: `npm run build`
- Install command: `npm ci`
- Required env: `DATABASE_URL`, `JWT_SECRET`

## AWS / Azure / DigitalOcean
- Use root `Dockerfile`.
- Set reverse proxy and TLS termination.
- Mount `uploads/` or replace storage adapter with object storage.

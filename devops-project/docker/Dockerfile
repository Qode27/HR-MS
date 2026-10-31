# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# PeopleFlow HR - production image (multi-stage, non-root, standalone Next.js)
#
# Build from the REPOSITORY ROOT (the folder that contains package.json):
#   docker build -f devops-project/docker/Dockerfile -t peopleflow-web:local .
#   docker build -f devops-project/docker/Dockerfile --target migrator -t peopleflow-migrator:local .
#
# Targets
#   runner   -> small runtime image that serves the UI + API (tier 1 + tier 2)
#   migrator -> one-shot image that runs `prisma migrate deploy` (and seed)
# -----------------------------------------------------------------------------
ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- 1. Dependencies (cached until package*.json changes) --------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- 2. Build ----------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma generate needs a syntactically valid URL at build time only.
# The real value is injected at runtime from a Secret / Key Vault.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}
RUN mkdir -p public && npm run build

# ---- 3. Migrator (one-shot job: schema migrations + optional seed) -----------
FROM builder AS migrator
ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- 4. Runtime --------------------------------------------------------------
FROM base AS runner
ARG APP_VERSION=dev
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="peopleflow-web" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_SHA}"
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_VERSION=${APP_VERSION}

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Prisma query engine generated for this platform (musl)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]

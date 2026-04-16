import { PrismaClient } from "@prisma/client";

function resolveDatabaseUrl() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    if (process.env.NODE_ENV === "test") {
      return "postgresql://postgres:postgres@localhost:5432/peopleflow_hr?schema=public";
    }
    throw new Error("DATABASE_URL is required");
  }

  const tenantSchema = process.env.TENANT_SCHEMA;
  const url = new URL(baseUrl);
  if (tenantSchema) {
    url.searchParams.set("schema", tenantSchema);
  }

  // Prisma defaults are too small for this app's parallel page queries.
  // Keep the pool modest, but large enough to avoid connection starvation.
  const currentLimit = Number(url.searchParams.get("connection_limit") || "0");
  if (!Number.isFinite(currentLimit) || currentLimit < 5) {
    url.searchParams.set("connection_limit", "5");
  }
  const currentTimeout = Number(url.searchParams.get("pool_timeout") || "0");
  if (!Number.isFinite(currentTimeout) || currentTimeout < 60) {
    url.searchParams.set("pool_timeout", "60");
  }
  return url.toString();
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: resolveDatabaseUrl()
      }
    }
  });
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

import { PrismaClient } from "@prisma/client";

function resolveDatabaseUrl() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const tenantSchema = process.env.TENANT_SCHEMA;
  if (!tenantSchema) return baseUrl;

  const url = new URL(baseUrl);
  url.searchParams.set("schema", tenantSchema);
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

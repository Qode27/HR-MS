import { prisma } from "@/lib/db";
import { success, failure } from "@backend/utils/api-response";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return success({ status: "ready", db: "ok", timestamp: new Date().toISOString() });
  } catch {
    return failure("Database unavailable", 503);
  }
}

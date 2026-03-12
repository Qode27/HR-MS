import { prisma } from "@/lib/db";

export async function writeAuditLog(input: {
  userId?: string;
  action: string;
  module: string;
  entityId?: string;
  meta?: unknown;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({ data: input });
}

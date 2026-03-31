import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function writeAuditLog(input: {
  userId?: string;
  action: string;
  module: string;
  entityId?: string;
  meta?: unknown;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      module: input.module,
      entityId: input.entityId,
      ipAddress: input.ipAddress,
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.meta === undefined ? {} : { meta: input.meta as Prisma.InputJsonValue })
    }
  });
}

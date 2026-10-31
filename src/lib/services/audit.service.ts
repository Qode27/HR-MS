import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function writeAuditLog(input: {
  userId?: string;
  action: string;
  module: string;
  entityId?: string;
  meta?: unknown;
  ipAddress?: string;
}) {
  const data: Prisma.AuditLogUncheckedCreateInput = {
    action: input.action,
    module: input.module
  };

  if (input.userId) data.userId = input.userId;
  if (input.entityId) data.entityId = input.entityId;
  if (input.meta !== undefined) data.meta = input.meta as Prisma.InputJsonValue;
  if (input.ipAddress) data.ipAddress = input.ipAddress;

  await prisma.auditLog.create({ data });
}

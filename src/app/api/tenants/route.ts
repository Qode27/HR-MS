import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ClientService } from "@backend/services/client.service";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "tenant:read");
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    include: { subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" }
  });
  return success(tenants);
});

export const POST = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "tenant:manage");
  const payload = await req.json();
  const service = new ClientService();
  const client = await service.create({
    companyName: payload?.companyName || payload?.name,
    slug: payload?.slug,
    domain: payload?.domain,
    contactName: payload?.contactName || payload?.ownerName,
    contactEmail: payload?.contactEmail || payload?.ownerEmail,
    contactPhone: payload?.contactPhone,
    subscriptionPlan: payload?.subscriptionPlan || payload?.planName || "Enterprise",
    employeeLimit: payload?.employeeLimit || 1000,
    monthlyPrice: payload?.monthlyPrice || 49999,
    status: payload?.status || "ACTIVE",
    password: payload?.password
  });

  return success(client, undefined, 201, "Client created");
});

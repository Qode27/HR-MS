import { NextRequest } from "next/server";
import { ClientService } from "@backend/services/client.service";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requireRole } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";

const service = new ClientService();

export const GET = withApiGuard(async (req: NextRequest) => {
  await requireRole(req, ["MASTER_ADMIN"]);
  const { searchParams } = new URL(req.url);
  const { items, pagination } = await service.list(searchParams);
  return success(items, { pagination }, 200, "Clients loaded");
});

export const POST = withApiGuard(async (req: NextRequest) => {
  await requireRole(req, ["MASTER_ADMIN"]);
  const client = await service.create(await req.json());
  return success(client, undefined, 201, "Client created");
});

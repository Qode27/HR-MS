import { NextRequest } from "next/server";
import { ClientService } from "@backend/services/client.service";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requireRole } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";

type Params = { params: Promise<{ id: string }> };

const service = new ClientService();

export const GET = withApiGuard(async (req: NextRequest, { params }: Params) => {
  await requireRole(req, ["MASTER_ADMIN"]);
  const { id } = await params;
  const client = await service.detail(id);
  return success(client, undefined, 200, "Client loaded");
});

export const PUT = withApiGuard(async (req: NextRequest, { params }: Params) => {
  await requireRole(req, ["MASTER_ADMIN"]);
  const { id } = await params;
  const client = await service.update(id, await req.json());
  return success(client, undefined, 200, "Client updated");
});

export const PATCH = PUT;

export const DELETE = withApiGuard(async (req: NextRequest, { params }: Params) => {
  await requireRole(req, ["MASTER_ADMIN"]);
  const { id } = await params;
  const deleted = await service.softDelete(id);
  return success(deleted, undefined, 200, "Client deleted");
});

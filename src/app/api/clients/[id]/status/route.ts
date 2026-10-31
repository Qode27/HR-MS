import { NextRequest } from "next/server";
import { ClientService } from "@backend/services/client.service";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requireRole } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";

type Params = { params: Promise<{ id: string }> };

const service = new ClientService();

export const PATCH = withApiGuard(async (req: NextRequest, { params }: Params) => {
  await requireRole(req, ["MASTER_ADMIN"]);
  const { id } = await params;
  const payload = await req.json();
  const client = await service.updateStatus(id, payload?.status);
  return success(client, undefined, 200, "Client status updated");
});

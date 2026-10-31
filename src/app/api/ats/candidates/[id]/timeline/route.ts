import { NextRequest } from "next/server";
import { AtsService } from "@backend/services/ats.service";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";

type Params = { params: Promise<{ id: string }> };
const service = new AtsService();

export const GET = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const session = await requirePermission(req, "ats:manage");
  const timeline = await service.timeline(id, session.role === "MASTER_ADMIN" ? undefined : session.tenantId);
  return success(timeline);
});

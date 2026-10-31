import { NextRequest } from "next/server";
import { candidateStageSchema } from "@/lib/validators/schemas";
import { AtsService } from "@backend/services/ats.service";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { parseBody } from "@backend/utils/request";
import { success } from "@backend/utils/api-response";

type Params = { params: Promise<{ id: string }> };
const service = new AtsService();

export const PATCH = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const session = await requirePermission(req, "ats:manage");
  const payload = parseBody(candidateStageSchema, await req.json());
  const candidate = await service.updateStage({
    id,
    stage: payload.stage,
    rejectionReason: payload.rejectionReason,
    actorUserId: session.sub,
    tenantId: session.role === "MASTER_ADMIN" ? undefined : session.tenantId
  });
  return success(candidate, undefined, 200, "Candidate stage updated");
});

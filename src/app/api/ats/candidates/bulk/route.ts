import { NextRequest } from "next/server";
import { z } from "zod";
import { AtsService } from "@backend/services/ats.service";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { parseBody } from "@backend/utils/request";
import { success } from "@backend/utils/api-response";

const schema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  action: z.enum(["move", "assign", "reject", "tag"]),
  stage: z.enum(["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "OFFERED", "JOINED", "REJECTED", "ON_HOLD"]).optional(),
  recruiterId: z.string().optional(),
  tag: z.string().optional(),
  rejectionReason: z.string().optional()
});

const service = new AtsService();

export const PATCH = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "ats:manage");
  const payload = parseBody(schema, await req.json());
  const result = await service.bulkUpdate({
    ...payload,
    actorUserId: session.sub,
    tenantId: session.role === "MASTER_ADMIN" ? undefined : session.tenantId
  });
  return success(result, undefined, 200, "Bulk action completed");
});

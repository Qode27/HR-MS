import { NextRequest } from "next/server";
import { z } from "zod";
import { AtsService } from "@backend/services/ats.service";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { parseBody } from "@backend/utils/request";
import { success } from "@backend/utils/api-response";

type Params = { params: Promise<{ id: string }> };
const schema = z.object({ comment: z.string().min(1).max(2000) });
const service = new AtsService();

export const POST = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const session = await requirePermission(req, "ats:manage");
  const payload = parseBody(schema, await req.json());
  const note = await service.addNote({
    id,
    comment: payload.comment,
    actorUserId: session.sub,
    tenantId: session.role === "MASTER_ADMIN" ? undefined : session.tenantId
  });
  return success(note, undefined, 201, "Note added");
});

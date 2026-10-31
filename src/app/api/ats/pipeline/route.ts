import { NextRequest } from "next/server";
import { AtsController } from "@backend/controllers/ats.controller";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";

const controller = new AtsController();

export const GET = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "ats:manage");
  return controller.pipeline(req, session.role === "MASTER_ADMIN" ? undefined : session.tenantId);
});

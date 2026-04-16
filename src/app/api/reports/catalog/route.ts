import { NextRequest } from "next/server";
import { REPORT_DEFINITIONS } from "@/lib/report-catalog";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "reports:read");
  return success(REPORT_DEFINITIONS);
});

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { DashboardController } from "@backend/controllers/dashboard.controller";
import { withApiGuard } from "@backend/middleware/with-api-guard";

const controller = new DashboardController();

export const GET = withApiGuard(async (req: NextRequest) => {
  const session = await getSession();
  return controller.summary(req, session?.role);
});

import { NextRequest } from "next/server";
import { DashboardService } from "@backend/services/dashboard.service";
import { success } from "@backend/utils/api-response";

export class DashboardController {
  constructor(private readonly service = new DashboardService()) {}

  async summary(req: NextRequest, role?: string, userId?: string) {
    const data = await this.service.summary(role, userId);
    return success({ role, ...data });
  }
}

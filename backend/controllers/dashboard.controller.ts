import { NextRequest } from "next/server";
import { DashboardService } from "@backend/services/dashboard.service";
import { success } from "@backend/utils/api-response";

export class DashboardController {
  constructor(private readonly service = new DashboardService()) {}

  async summary(req: NextRequest, role?: string) {
    const data = await this.service.summary();
    return success({ role, ...data });
  }
}

import { NextRequest } from "next/server";
import { AtsService } from "@backend/services/ats.service";
import { success } from "@backend/utils/api-response";

export class AtsController {
  constructor(private readonly service = new AtsService()) {}

  async pipeline(req: NextRequest) {
    const data = await this.service.pipeline();
    return success(data);
  }

  async candidates(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const data = await this.service.listCandidates(q);
    return success(data);
  }
}

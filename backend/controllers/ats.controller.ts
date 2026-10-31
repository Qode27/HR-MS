import { NextRequest } from "next/server";
import { AtsService } from "@backend/services/ats.service";
import { success } from "@backend/utils/api-response";

export class AtsController {
  constructor(private readonly service = new AtsService()) {}

  async pipeline(req: NextRequest, tenantId?: string | null) {
    const data = await this.service.pipeline(tenantId);
    return success(data);
  }

  async candidates(req: NextRequest, tenantId?: string | null) {
    const { searchParams } = new URL(req.url);
    const skills = searchParams.get("skills")?.split(",").map((item) => item.trim()).filter(Boolean);
    const data = await this.service.listCandidates({
      tenantId,
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || searchParams.get("pageSize") || 20),
      search: searchParams.get("search") || searchParams.get("q") || "",
      jobId: searchParams.get("jobId") || undefined,
      stage: searchParams.get("stage") || undefined,
      experienceMin: searchParams.has("experienceMin") ? Number(searchParams.get("experienceMin")) : undefined,
      experienceMax: searchParams.has("experienceMax") ? Number(searchParams.get("experienceMax")) : undefined,
      skills,
      location: searchParams.get("location") || undefined,
      source: searchParams.get("source") || undefined,
      recruiterId: searchParams.get("recruiterId") || undefined,
      dateFrom: searchParams.get("dateFrom") ? new Date(String(searchParams.get("dateFrom"))) : undefined,
      dateTo: searchParams.get("dateTo") ? new Date(String(searchParams.get("dateTo"))) : undefined,
      status: searchParams.get("status") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") === "asc" ? "asc" : "desc",
      view: searchParams.get("view") || undefined,
      stageLimit: Number(searchParams.get("stageLimit") || 20),
      priority: (searchParams.get("priority") as any) || undefined
    });
    return success(data);
  }
}

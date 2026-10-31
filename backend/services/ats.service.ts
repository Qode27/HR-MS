import { CandidatePriority, CandidateStage, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@backend/utils/errors";

const PIPELINE_STAGES: Array<{ key: string; label: string; stages: CandidateStage[]; nextAction: string }> = [
  { key: "APPLIED", label: "Applied", stages: ["APPLIED"], nextAction: "Review resume" },
  { key: "SCREENING", label: "Screening", stages: ["SCREENING"], nextAction: "Call candidate" },
  { key: "SHORTLISTED", label: "Shortlisted", stages: ["SHORTLISTED"], nextAction: "Schedule interview" },
  { key: "INTERVIEW", label: "Interview", stages: ["INTERVIEW_SCHEDULED", "INTERVIEWED"], nextAction: "Awaiting feedback" },
  { key: "OFFER", label: "Offer", stages: ["SELECTED", "OFFERED"], nextAction: "Send offer" },
  { key: "HIRED", label: "Hired", stages: ["JOINED"], nextAction: "Complete onboarding" },
  { key: "REJECTED", label: "Rejected", stages: ["REJECTED"], nextAction: "No action needed" }
];

const STAGE_VALUES = new Set(Object.values(CandidateStage));

type CandidateListInput = {
  tenantId?: string | null;
  page?: number;
  limit?: number;
  search?: string;
  jobId?: string;
  stage?: string;
  experienceMin?: number;
  experienceMax?: number;
  skills?: string[];
  location?: string;
  source?: string;
  recruiterId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  view?: string;
  stageLimit?: number;
  priority?: CandidatePriority;
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.floor(value), min), max);
}

function tenantWhere(tenantId?: string | null) {
  return tenantId ? { tenantId } : {};
}

function stagesForFilter(stage?: string): CandidateStage[] | undefined {
  if (!stage) return undefined;
  const direct = stage.toUpperCase();
  const pipeline = PIPELINE_STAGES.find((item) => item.key === direct);
  if (pipeline) return pipeline.stages;
  if (STAGE_VALUES.has(direct as CandidateStage)) return [direct as CandidateStage];
  return undefined;
}

function nextActionFor(stage: CandidateStage) {
  return PIPELINE_STAGES.find((item) => item.stages.includes(stage))?.nextAction || "Review candidate";
}

function daysSince(value: Date | string) {
  return Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
}

function priorityFor(candidate: { stage: CandidateStage; updatedAt: Date | string; nextActionDate?: Date | string | null; priority?: CandidatePriority | null }) {
  if (["INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "OFFERED"].includes(candidate.stage)) return "HIGH" as CandidatePriority;
  if (!["JOINED", "REJECTED"].includes(candidate.stage) && candidate.nextActionDate && new Date(candidate.nextActionDate).getTime() <= Date.now()) return "HIGH" as CandidatePriority;
  if (!["JOINED", "REJECTED"].includes(candidate.stage) && daysSince(candidate.updatedAt) >= 5) return "HIGH" as CandidatePriority;
  if (["SCREENING", "SHORTLISTED", "ON_HOLD"].includes(candidate.stage)) return "MEDIUM" as CandidatePriority;
  return candidate.priority || "LOW";
}

function workflowSection(candidate: { stage: CandidateStage; updatedAt: Date | string; nextActionDate?: Date | string | null; priority?: CandidatePriority | null }) {
  if (["JOINED", "REJECTED"].includes(candidate.stage)) return "Completed";
  if (priorityFor(candidate) === "HIGH" || (candidate.nextActionDate && new Date(candidate.nextActionDate).getTime() <= Date.now()) || daysSince(candidate.updatedAt) >= 2) return "Needs Action";
  return "Waiting";
}

function candidateSelect() {
  return {
    id: true,
    tenantId: true,
    fullName: true,
    email: true,
    phone: true,
    currentLocation: true,
    totalExperience: true,
    skills: true,
    source: true,
    stage: true,
    priority: true,
    rating: true,
    assignedRecruiterId: true,
    nextAction: true,
    nextActionDate: true,
    tags: true,
    createdAt: true,
    updatedAt: true,
    resumePath: true,
    rejectionReason: true,
    jobOpening: { select: { id: true, title: true, status: true } },
    assignedRecruiter: { select: { id: true, fullName: true, email: true } },
    interviews: { select: { id: true, scheduledAt: true, mode: true }, orderBy: { scheduledAt: "desc" as const }, take: 1 },
    _count: { select: { comments: true, activity: true, interviews: true, documents: true } }
  };
}

function toCandidateDto(candidate: any) {
  const nextInterviewAt = candidate.interviews?.[0]?.scheduledAt ?? null;
  const nextActionDate = candidate.nextActionDate || nextInterviewAt;
  const computedPriority = priorityFor({ ...candidate, nextActionDate });
  const staleDays = daysSince(candidate.updatedAt);
  return {
    ...candidate,
    totalExperience: candidate.totalExperience === null || candidate.totalExperience === undefined ? null : Number(candidate.totalExperience),
    nextAction: candidate.nextAction || nextActionFor(candidate.stage),
    nextActionDate,
    nextInterviewAt,
    priority: computedPriority,
    workflowSection: workflowSection({ ...candidate, nextActionDate, priority: computedPriority }),
    staleDays,
    needsReview: !["JOINED", "REJECTED"].includes(candidate.stage) && staleDays >= 2,
    isOverdue: Boolean(nextActionDate && new Date(nextActionDate).getTime() < Date.now() && !["JOINED", "REJECTED"].includes(candidate.stage))
  };
}

export class AtsService {
  private where(input: CandidateListInput): Prisma.CandidateWhereInput {
    const stageFilter = stagesForFilter(input.stage);
    const activeStages: CandidateStage[] = ["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "OFFERED", "ON_HOLD"];
    const search = input.search?.trim();

    return {
      ...tenantWhere(input.tenantId),
      ...(input.jobId ? { jobOpeningId: input.jobId } : {}),
      ...(stageFilter ? { stage: { in: stageFilter } } : {}),
      ...(input.experienceMin !== undefined || input.experienceMax !== undefined
        ? { totalExperience: { gte: input.experienceMin, lte: input.experienceMax } }
        : {}),
      ...(input.skills?.length ? { skills: { hasSome: input.skills } } : {}),
      ...(input.location ? { currentLocation: { contains: input.location, mode: "insensitive" } } : {}),
      ...(input.source ? { source: input.source as any } : {}),
      ...(input.recruiterId ? { assignedRecruiterId: input.recruiterId } : {}),
      ...(input.dateFrom || input.dateTo ? { createdAt: { gte: input.dateFrom, lte: input.dateTo } } : {}),
      ...(input.status === "active" ? { stage: { in: stageFilter || activeStages } } : {}),
      ...(input.status === "rejected" ? { stage: "REJECTED" } : {}),
      ...(input.status === "hired" ? { stage: "JOINED" } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { skills: { hasSome: search.split(",").map((item) => item.trim()).filter(Boolean) } },
              { resumeText: { contains: search, mode: "insensitive" } },
              { parsedResume: { path: ["summary"], string_contains: search } as any }
            ]
          }
        : {})
    };
  }

  async pipeline(tenantId?: string | null) {
    const grouped = await prisma.candidate.groupBy({ by: ["stage"], where: tenantWhere(tenantId), _count: true });
    return PIPELINE_STAGES.map((stage) => ({
      ...stage,
      count: grouped.filter((row) => stage.stages.includes(row.stage)).reduce((sum, row) => sum + row._count, 0)
    }));
  }

  async listCandidates(input: CandidateListInput) {
    const page = clamp(Number(input.page || 1), 1, 10_000);
    const limit = clamp(Number(input.limit || 20), 1, 100);
    const where = this.where(input);
    const sortable = new Set(["createdAt", "updatedAt", "fullName", "totalExperience", "nextActionDate"]);
    const sortBy = sortable.has(input.sortBy || "") ? input.sortBy! : "updatedAt";
    const sortOrder = input.sortOrder === "asc" ? "asc" : "desc";

    if (input.view === "pipeline") {
      const stageLimit = clamp(Number(input.stageLimit || limit || 20), 5, 100);
      const [counts, rawStats, upcomingInterviews, stageRows] = await Promise.all([
        prisma.candidate.groupBy({ by: ["stage"], where, _count: true }),
        prisma.candidate.findMany({
          where,
          select: { id: true, stage: true, priority: true, updatedAt: true, nextAction: true, nextActionDate: true, fullName: true, jobOpening: { select: { title: true } } },
          orderBy: [{ nextActionDate: "asc" }, { updatedAt: "asc" }],
          take: 300
        }),
        prisma.interview.findMany({
          where: { candidate: where, scheduledAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 86_400_000) } },
          include: { candidate: { select: { id: true, fullName: true, jobOpening: { select: { title: true } } } } },
          orderBy: { scheduledAt: "asc" },
          take: 12
        }),
        Promise.all(
          PIPELINE_STAGES.map(async (stage) => {
            const stageWhere = { ...where, stage: { in: stage.stages } };
            const [items, total] = await Promise.all([
              prisma.candidate.findMany({
                where: stageWhere,
                select: candidateSelect(),
                orderBy: [{ nextActionDate: "asc" }, { updatedAt: "desc" }],
                take: stageLimit
              }),
              prisma.candidate.count({ where: stageWhere })
            ]);
            const mapped = items.map(toCandidateDto);
            return {
              ...stage,
              total,
              hasMore: total > stageLimit,
              items: mapped.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "HIGH" ? -1 : b.priority === "HIGH" ? 1 : a.priority === "MEDIUM" ? -1 : 1))
            };
          })
        )
      ]);
      const statRows = rawStats.map(toCandidateDto);
      return {
        view: "pipeline",
        total: counts.reduce((sum, row) => sum + row._count, 0),
        todayWork: {
          needsAction: statRows.filter((candidate) => candidate.workflowSection === "Needs Action").slice(0, 8),
          overdue: statRows.filter((candidate) => candidate.isOverdue).slice(0, 8),
          upcomingInterviews: upcomingInterviews.map((interview) => ({
            id: interview.id,
            scheduledAt: interview.scheduledAt,
            candidateId: interview.candidateId,
            fullName: interview.candidate.fullName,
            jobTitle: interview.candidate.jobOpening?.title || "Open role",
            mode: interview.mode
          }))
        },
        stages: stageRows
      };
    }

    const [items, total, counts] = await Promise.all([
      prisma.candidate.findMany({
        where,
        select: candidateSelect(),
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.candidate.count({ where }),
      this.pipeline(input.tenantId)
    ]);

    return {
      view: input.view || "table",
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      counts,
      items: items.map(toCandidateDto)
    };
  }

  async updateStage(input: { id: string; stage: CandidateStage; actorUserId: string; tenantId?: string | null; rejectionReason?: string }) {
    const candidate = await prisma.candidate.findFirst({ where: { id: input.id, ...tenantWhere(input.tenantId) }, select: { id: true, stage: true } });
    if (!candidate) throw new AppError("Candidate not found", 404);
    const updated = await prisma.candidate.update({
      where: { id: input.id },
      data: {
        stage: input.stage,
        rejectionReason: input.stage === "REJECTED" ? input.rejectionReason || "Rejected during hiring process" : null,
        nextAction: nextActionFor(input.stage),
        nextActionDate: null,
        priority: priorityFor({ stage: input.stage, updatedAt: new Date(), nextActionDate: null }),
        activity: { create: { action: "Stage changed", meta: { from: candidate.stage, to: input.stage, by: input.actorUserId } } }
      },
      select: candidateSelect()
    });
    return toCandidateDto(updated);
  }

  async bulkUpdate(input: { ids: string[]; action: string; actorUserId: string; tenantId?: string | null; stage?: CandidateStage; recruiterId?: string; tag?: string; rejectionReason?: string }) {
    const ids = Array.from(new Set(input.ids)).slice(0, 500);
    if (!ids.length) throw new AppError("Select at least one candidate", 422);
    const where = { id: { in: ids }, ...tenantWhere(input.tenantId) };
    const existing = await prisma.candidate.findMany({ where, select: { id: true } });
    if (existing.length !== ids.length) throw new AppError("One or more candidates are unavailable in this tenant", 403);

    if (input.action === "move") {
      if (!input.stage) throw new AppError("Stage is required", 422);
      await prisma.candidate.updateMany({ where, data: { stage: input.stage, nextAction: nextActionFor(input.stage), nextActionDate: null, priority: priorityFor({ stage: input.stage, updatedAt: new Date(), nextActionDate: null }), rejectionReason: input.stage === "REJECTED" ? input.rejectionReason || "Rejected during bulk update" : null } });
    } else if (input.action === "assign") {
      if (!input.recruiterId) throw new AppError("Recruiter is required", 422);
      const recruiter = await prisma.user.findFirst({ where: { id: input.recruiterId, ...tenantWhere(input.tenantId) }, select: { id: true } });
      if (!recruiter) throw new AppError("Recruiter not found", 404);
      await prisma.candidate.updateMany({ where, data: { assignedRecruiterId: input.recruiterId } });
    } else if (input.action === "reject") {
      await prisma.candidate.updateMany({ where, data: { stage: "REJECTED", priority: "LOW", rejectionReason: input.rejectionReason || "Rejected in bulk action", nextAction: "No action needed", nextActionDate: null } });
    } else if (input.action === "tag") {
      if (!input.tag?.trim()) throw new AppError("Tag is required", 422);
      for (const id of ids) {
        await prisma.candidate.update({ where: { id }, data: { tags: { push: input.tag.trim() }, activity: { create: { action: "Tag added", meta: { tag: input.tag.trim(), by: input.actorUserId } } } } });
      }
    } else {
      throw new AppError("Unsupported bulk action", 422);
    }

    await prisma.candidateActivity.createMany({
      data: ids.map((candidateId) => ({ candidateId, action: `Bulk ${input.action}`, meta: { by: input.actorUserId, stage: input.stage, recruiterId: input.recruiterId, tag: input.tag } }))
    });
    return { updated: ids.length };
  }

  async details(id: string, tenantId?: string | null) {
    const candidate = await prisma.candidate.findFirst({
      where: { id, ...tenantWhere(tenantId) },
      include: {
        jobOpening: { include: { requisition: true } },
        assignedRecruiter: { select: { id: true, fullName: true, email: true } },
        comments: { orderBy: { createdAt: "desc" } },
        activity: { orderBy: { createdAt: "desc" } },
        interviews: { orderBy: { scheduledAt: "desc" } },
        offer: true,
        onboardingTasks: true,
        documents: { orderBy: { createdAt: "desc" } }
      }
    });
    if (!candidate) throw new AppError("Candidate not found", 404);
    return toCandidateDto(candidate);
  }

  async timeline(id: string, tenantId?: string | null) {
    const candidate = await prisma.candidate.findFirst({ where: { id, ...tenantWhere(tenantId) }, select: { id: true } });
    if (!candidate) throw new AppError("Candidate not found", 404);
    const [activity, interviews, comments] = await Promise.all([
      prisma.candidateActivity.findMany({ where: { candidateId: id }, orderBy: { createdAt: "desc" } }),
      prisma.interview.findMany({ where: { candidateId: id }, orderBy: { scheduledAt: "desc" } }),
      prisma.candidateComment.findMany({ where: { candidateId: id }, orderBy: { createdAt: "desc" } })
    ]);
    return { activity, interviews, comments };
  }

  async addNote(input: { id: string; comment: string; actorUserId: string; tenantId?: string | null }) {
    const candidate = await prisma.candidate.findFirst({ where: { id: input.id, ...tenantWhere(input.tenantId) }, select: { id: true } });
    if (!candidate) throw new AppError("Candidate not found", 404);
    const row = await prisma.candidateComment.create({ data: { candidateId: input.id, authorId: input.actorUserId, comment: input.comment.slice(0, 2000) } });
    await prisma.candidateActivity.create({ data: { candidateId: input.id, action: "Note added", meta: { by: input.actorUserId } } });
    return row;
  }

  stages() {
    return PIPELINE_STAGES;
  }
}

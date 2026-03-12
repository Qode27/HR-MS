import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { withPermission } from "@/lib/server";
import { jobOpeningSchema } from "@/lib/validators/schemas";

export async function GET(req: NextRequest) {
  const access = await withPermission(req, "ats:manage");
  if (access.error) return access.error;
  const jobs = await prisma.jobOpening.findMany({
    include: { requisition: true, recruiter: true, candidates: true, workLocation: true },
    orderBy: { createdAt: "desc" }
  });
  return ok(jobs);
}

export async function POST(req: NextRequest) {
  const access = await withPermission(req, "ats:manage");
  if (access.error) return access.error;
  const parsed = jobOpeningSchema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.message, 422);

  const job = await prisma.jobOpening.create({
    data: {
      ...parsed.data,
      status: "OPEN",
      publishedAt: new Date()
    }
  });
  return ok(job, 201);
}

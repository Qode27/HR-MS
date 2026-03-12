import { prisma } from "@/lib/db";
import { ok } from "@/lib/http";

export async function GET() {
  const jobs = await prisma.jobOpening.findMany({ where: { status: "OPEN" }, include: { workLocation: true } });
  return ok(jobs);
}

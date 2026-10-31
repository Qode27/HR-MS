import { prisma } from "@/lib/db";

export class AtsRepository {
  pipeline(tenantId?: string | null) {
    return prisma.candidate.groupBy({ by: ["stage"], where: tenantId ? { tenantId } : {}, _count: true });
  }

  listCandidates(q: string, tenantId?: string | null) {
    return prisma.candidate.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          q ? { skills: { hasSome: [q] } } : {}
        ]
      },
      include: { jobOpening: true, comments: true },
      orderBy: { createdAt: "desc" }
    });
  }
}

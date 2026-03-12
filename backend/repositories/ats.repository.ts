import { prisma } from "@/lib/db";

export class AtsRepository {
  pipeline() {
    return prisma.candidate.groupBy({ by: ["stage"], _count: true });
  }

  listCandidates(q: string) {
    return prisma.candidate.findMany({
      where: {
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

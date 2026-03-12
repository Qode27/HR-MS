import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

export class DashboardService {
  private summaryCache = unstable_cache(
    async () => {
      const [employees, pendingLeaves, openPositions, candidates, announcements] = await Promise.all([
        prisma.employee.count({ where: { deletedAt: null } }),
        prisma.leaveRequest.count({ where: { status: "PENDING" } }),
        prisma.jobOpening.count({ where: { status: "OPEN" } }),
        prisma.candidate.groupBy({ by: ["stage"], _count: true }),
        prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
      ]);

      return {
        stats: { employees, pendingLeaves, openPositions },
        candidatesByStage: candidates,
        announcements
      };
    },
    ["dashboard-summary"],
    { revalidate: 60 }
  );

  summary() {
    return this.summaryCache();
  }
}

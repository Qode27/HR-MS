"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { fetchDashboardSummary } from "@frontend/services/hrms-api";

type DashboardData = Awaited<ReturnType<typeof fetchDashboardSummary>>;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const candidateSeries = data?.candidatesByStage || [];
  const maxCandidates = Math.max(1, ...candidateSeries.map((row) => row._count));

  useEffect(() => {
    setLoading(true);
    fetchDashboardSummary()
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-4">
      <PageHeader title="Dashboard" subtitle="Enterprise HR command center" />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Employees" value={loading ? "..." : data?.stats.employees ?? 0} />
        <StatCard title="Pending Leaves" value={loading ? "..." : data?.stats.pendingLeaves ?? 0} />
        <StatCard title="Open Positions" value={loading ? "..." : data?.stats.openPositions ?? 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-80">
          <p className="mb-3 text-sm font-medium">Candidates by stage</p>
          <div className="space-y-3">
            {candidateSeries.length > 0 ? (
              candidateSeries.map((row) => {
                const width = `${Math.max(8, Math.round((row._count / maxCandidates) * 100))}%`;
                return (
                  <div key={row.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{row.stage.replaceAll("_", " ")}</span>
                      <span>{row._count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary">
                      <div className="h-2 rounded-full bg-primary" style={{ width }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No candidate data yet.</p>
            )}
          </div>
        </Card>
        <Card>
          <p className="mb-3 text-sm font-medium">Announcements</p>
          <div className="space-y-2">
            {(data?.announcements || []).map((a) => (
              <div key={a.id} className="rounded-md border p-3 text-sm">{a.title}</div>
            ))}
            {!loading && (data?.announcements || []).length === 0 ? <p className="text-sm text-muted-foreground">No announcements</p> : null}
          </div>
        </Card>
      </div>
    </section>
  );
}

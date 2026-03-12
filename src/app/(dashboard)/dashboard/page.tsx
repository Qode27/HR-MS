"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { fetchDashboardSummary } from "@frontend/services/hrms-api";

type DashboardData = Awaited<ReturnType<typeof fetchDashboardSummary>>;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={data?.candidatesByStage || []}>
              <XAxis dataKey="stage" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="_count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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

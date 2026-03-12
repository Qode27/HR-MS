"use client";

import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";

export default function ReportsPage() {
  const { data } = useApi<any>("/api/reports/overview", []);
  const presentToday = (data?.kpis?.todayAttendance || []).find((x: any) => x.status === "PRESENT")?._count || 0;
  const absentToday = (data?.kpis?.todayAttendance || []).find((x: any) => x.status === "ABSENT")?._count || 0;
  return (
    <section className="space-y-4">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Attendance, leave, hiring and payroll insights"
        actions={
          <div className="flex gap-2">
            <a href="/api/reports/export?format=csv"><Button size="sm" variant="outline">Export CSV</Button></a>
            <a href="/api/reports/export?format=xlsx"><Button size="sm">Export Excel</Button></a>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Present Today" value={presentToday} />
        <StatCard title="Absent Today" value={absentToday} />
        <StatCard title="Open Jobs" value={data?.kpis?.openJobs || 0} />
        <StatCard title="Interviews Today" value={data?.kpis?.interviewsToday || 0} />
      </div>
      <Card><pre className="overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre></Card>
    </section>
  );
}

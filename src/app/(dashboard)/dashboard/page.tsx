"use client";

import Link from "next/link";
import type { Route } from "next";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui/card";
import { ROLE_LABELS, normalizeRole } from "@/lib/roles";

type DashboardPayload = {
  role?: string;
  scope: "company" | "team" | "self";
  stats: Record<string, number>;
  announcements?: Array<{ id: string; title: string }>;
  quickLinks?: string[];
  candidatesByStage?: Array<{ stage: string; _count: number }>;
  attendanceToday?: Array<{ status: string; _count: number }>;
  attendanceSummary?: Array<{ status: string; _count: number }>;
  leaveBalances?: Array<{ id: string; leaveType: string; allocated: number; used: number; remaining: number }>;
  payroll?: { month: number; year: number; status: string; employees: number } | null;
  employee?: { name: string; employeeCode: string; department: string; designation: string };
  teamSummary?: { reportees: number; openApprovals: number } | null;
};

const linkLabels: Record<string, string> = {
  "/employees": "Employees",
  "/attendance": "Attendance",
  "/leave": "Leave",
  "/payroll": "Payroll",
  "/payroll/payslips": "Payslips",
  "/ats": "ATS",
  "/documents": "Documents",
  "/reports": "Reports",
  "/settings": "Settings",
  "/profile": "Profile"
};

function niceStage(value: string) {
  return value === "JOINED" ? "Hired" : value.replaceAll("_", " ");
}

export default function DashboardPage() {
  const { data, loading, error } = useApi<DashboardPayload>("/api/dashboard/summary", []);
  const role = normalizeRole(data?.role);
  const isCompany = data?.scope === "company";

  return (
    <section className="space-y-4">
      <PageHeader
        title={isCompany ? "Company Dashboard" : data?.scope === "team" ? "Manager Dashboard" : "My Workspace"}
        subtitle={loading ? "Loading dashboard..." : `${ROLE_LABELS[role]} overview with role-safe modules and actions`}
      />

      {error ? <Card className="text-sm text-destructive">Unable to load dashboard: {error}</Card> : null}

      {isCompany ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title="Employees" value={loading ? "..." : data?.stats.employees ?? 0} />
            <StatCard title="Departments" value={loading ? "..." : data?.stats.departments ?? 0} />
            <StatCard title="Pending Leave" value={loading ? "..." : data?.stats.pendingLeaves ?? 0} />
            <StatCard title="Documents" value={loading ? "..." : data?.stats.documents ?? 0} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="space-y-3 lg:col-span-2">
              <div>
                <p className="text-sm font-medium">Business Operations Snapshot</p>
                <p className="text-xs text-muted-foreground">Company-wide attendance, payroll, hiring, and admin visibility.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Attendance today</p>
                  <p className="mt-2 font-medium">
                    {(data?.attendanceToday || []).map((item) => `${niceStage(item.status)}: ${item._count}`).join(" | ") || "No attendance data"}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest payroll</p>
                  <p className="mt-2 font-medium">
                    {data?.payroll ? `${data.payroll.month}/${data.payroll.year} - ${data.payroll.status}` : "No payroll run yet"}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Hiring pipeline</p>
                  <p className="mt-2 font-medium">
                    {(data?.candidatesByStage || []).slice(0, 4).map((item) => `${niceStage(item.stage)}: ${item._count}`).join(" | ") || "No hiring data"}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Admin controls</p>
                  <p className="mt-2 font-medium">Settings, reports, payroll processing, ATS, and document control.</p>
                </div>
              </div>
            </Card>
            <Card className="space-y-3">
              <p className="text-sm font-medium">Important Reports & Admin Links</p>
              <div className="grid gap-2">
                {(data?.quickLinks || []).map((href) => (
                  <Link key={href} href={href as Route} className="rounded-lg border px-3 py-2 text-sm hover:bg-secondary">
                    {linkLabels[href as keyof typeof linkLabels] || href}
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title={data?.scope === "team" ? "Reportees" : "My Profile"} value={loading ? "..." : data?.scope === "team" ? data?.teamSummary?.reportees ?? 0 : data?.stats.profileReady ?? 0} />
            <StatCard title="Pending Leave" value={loading ? "..." : data?.stats.pendingLeaves ?? 0} />
            <StatCard title="Documents" value={loading ? "..." : data?.stats.documents ?? 0} />
            <StatCard title="Payslips" value={loading ? "..." : data?.stats.payslips ?? 0} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="space-y-3 lg:col-span-2">
              <div>
                <p className="text-sm font-medium">{data?.scope === "team" ? "Team Operations" : "My HR Summary"}</p>
                <p className="text-xs text-muted-foreground">
                  {data?.scope === "team" ? "Approvals, attendance, and role-safe team visibility." : "Your attendance, leave, payslips, and company updates."}
                </p>
              </div>
              {data?.employee ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Employee</p>
                    <p className="mt-2 font-medium">{data.employee.name}</p>
                    <p className="text-xs text-muted-foreground">{data.employee.employeeCode} • {data.employee.department}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Attendance summary</p>
                    <p className="mt-2 font-medium">
                      {(data.attendanceSummary || []).map((item) => `${niceStage(item.status)}: ${item._count}`).join(" | ") || "No attendance records"}
                    </p>
                  </div>
                </div>
              ) : null}
              {data?.leaveBalances?.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {data.leaveBalances.map((balance) => (
                    <div key={balance.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">{balance.leaveType}</p>
                      <p className="text-xs text-muted-foreground">Allocated {balance.allocated} • Used {balance.used} • Remaining {balance.remaining}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Leave balances will appear here once allocated.</p>
              )}
            </Card>
            <Card className="space-y-3">
              <p className="text-sm font-medium">Quick Access</p>
              <div className="grid gap-2">
                {(data?.quickLinks || []).map((href) => (
                  <Link key={href} href={href as Route} className="rounded-lg border px-3 py-2 text-sm hover:bg-secondary">
                    {linkLabels[href as keyof typeof linkLabels] || href}
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      <Card className="space-y-2">
        <p className="text-sm font-medium">Announcements</p>
        {(data?.announcements || []).length ? (
          (data?.announcements || []).map((item) => (
            <div key={item.id} className="rounded-lg border px-3 py-2 text-sm">
              {item.title}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No announcements available.</p>
        )}
      </Card>
    </section>
  );
}

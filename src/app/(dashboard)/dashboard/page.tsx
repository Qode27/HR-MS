"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderKanban,
  Gauge,
  Landmark,
  LayoutDashboard,
  LineChart,
  Plus,
  Receipt,
  ShieldCheck,
  Users
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Metric = { label: string; value: number };
type Activity = { id: string; title: string; description?: string; status?: string; severity?: string; timestamp?: string };
type QuickAction = { label: string; href: string; description: string };
type ChartPoint = Record<string, string | number>;

type DashboardPayload = {
  role?: string;
  scope: "platform" | "company" | "self";
  stats: Record<string, number>;
  payroll?: { status: string; month: number; year: number } | null;
  recentClientActivity?: Activity[];
  onboarding?: Activity[];
  alerts?: Activity[];
  recentEmployeeActivity?: Activity[];
  announcements?: Array<{ id: string; title: string; content?: string }>;
  tasks?: Array<{ id: string; title: string; status: string; dueDate?: string | null }>;
  timesheetSummary?: Metric[];
  leaveBalances?: Array<{ id: string; leaveType: string; remaining: number }>;
  quickActions?: QuickAction[];
  charts?: {
    employeeGrowth?: ChartPoint[];
    attendanceTrend?: ChartPoint[];
    payrollDistribution?: { status: string; month: string | null; items: Array<{ label: string; value: number }> };
  };
};

const palette = ["#0f766e", "#2563eb", "#7c3aed", "#f59e0b", "#ef4444"];

function formatNumber(value?: number) {
  if (value === undefined || value === null) return "0";
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatMoney(value?: number) {
  if (value === undefined || value === null) return "Rs 0";
  return `Rs ${new Intl.NumberFormat("en-IN").format(value)}`;
}

function statusText(value?: string | null) {
  if (!value) return "Not started";
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function DashboardShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border bg-card px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <LayoutDashboard className="h-4 w-4" />
            Executive command center
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
          <Gauge className="h-4 w-4 text-primary" />
          Live database metrics
        </div>
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  loading,
  accent = "text-primary",
  rawValue,
  emptyMessage
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: typeof Users;
  loading?: boolean;
  accent?: string;
  rawValue?: number;
  emptyMessage?: string;
}) {
  const supportingText = rawValue === 0 && emptyMessage ? emptyMessage : hint;
  return (
    <div className="group rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
          {loading ? <Skeleton className="mt-3 h-8 w-24" /> : <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>}
        </div>
        <div className={cn("rounded-md bg-secondary p-2 transition group-hover:bg-primary/10", accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{supportingText}</p>
    </div>
  );
}

function Panel({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ActivityList({ items, empty }: { items?: Activity[]; empty: string }) {
  if (!items?.length) return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3 rounded-md border px-3 py-2 transition hover:bg-secondary/50">
          <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", item.severity === "HIGH" ? "bg-red-500" : item.status === "ACTIVE" ? "bg-emerald-500" : "bg-primary")} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
          </div>
          {item.status ? <span className="rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">{statusText(item.status)}</span> : null}
        </div>
      ))}
    </div>
  );
}

function QuickActions({ actions }: { actions?: QuickAction[] }) {
  if (!actions?.length) return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No actions available for this role.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {actions.map((action) => (
        <Link key={action.label} href={action.href as Route} className="group rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-md bg-primary/10 p-2 text-primary"><Plus className="h-4 w-4" /></span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
          </div>
          <p className="mt-3 text-sm font-semibold">{action.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
        </Link>
      ))}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">{message}</div>;
}

function GrowthChart({ data }: { data?: ChartPoint[] }) {
  if (!data?.length) return <EmptyChart message="Employee growth appears once employee profiles exist." />;
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="growth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={36} />
          <Tooltip />
          <Area type="monotone" dataKey="total" stroke="#0f766e" fill="url(#growth)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AttendanceTrend({ data }: { data?: ChartPoint[] }) {
  if (!data?.length) return <EmptyChart message="Timesheet trend appears after entries are submitted." />;
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={36} />
          <Tooltip />
          <Bar dataKey="approved" stackId="a" fill="#0f766e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="submitted" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="rejected" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PayrollDistribution({ data }: { data?: DashboardPayload["charts"] extends infer T ? T extends { payrollDistribution?: infer P } ? P : never : never }) {
  if (!data?.items?.length) return <EmptyChart message="Payroll distribution appears after a payroll run is prepared." />;
  const total = data.items.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-secondary/40 p-3">
        <p className="text-xs text-muted-foreground">{data.month ? `Payroll ${data.month}` : "Latest payroll"}</p>
        <p className="mt-1 text-2xl font-semibold">{formatMoney(total)}</p>
      </div>
      <div className="space-y-2">
        {data.items.map((item, index) => (
          <div key={item.label} className="rounded-md border px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: palette[index % palette.length] }} />{item.label}</span>
              <span className="font-medium">{formatMoney(item.value)}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-secondary">
              <div className="h-2 rounded-full" style={{ width: `${Math.max(4, Math.round((item.value / Math.max(total, 1)) * 100))}%`, background: palette[index % palette.length] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingDashboard() {
  return (
    <DashboardShell title="Dashboard" subtitle="Preparing live business metrics from the HRMS database.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-lg" />)}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Skeleton className="h-72 rounded-lg xl:col-span-2" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </DashboardShell>
  );
}

function MasterAdminDashboard({ data }: { data: DashboardPayload }) {
  return (
    <DashboardShell title="Platform Dashboard" subtitle="Operate every client, subscription, requirement, document, and risk signal from one trusted command center.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-8">
        <KpiCard title="Total Clients" value={formatNumber(data.stats.clients)} rawValue={data.stats.clients} emptyMessage="No clients onboarded yet" hint="Tenants onboarded" icon={Building2} />
        <KpiCard title="Active Clients" value={formatNumber(data.stats.activeClients)} rawValue={data.stats.activeClients} emptyMessage="No active client subscriptions" hint="Currently billable" icon={ShieldCheck} accent="text-emerald-600" />
        <KpiCard title="Trial Clients" value={formatNumber(data.stats.trialClients)} rawValue={data.stats.trialClients} emptyMessage="No trial clients" hint="Currently evaluating" icon={Users} />
        <KpiCard title="Suspended Clients" value={formatNumber(data.stats.suspendedClients)} rawValue={data.stats.suspendedClients} emptyMessage="No suspended clients" hint="Access restricted" icon={AlertTriangle} accent="text-amber-600" />
        <KpiCard title="Total Employees" value={formatNumber(data.stats.employees)} rawValue={data.stats.employees} emptyMessage="No employees added across tenants" hint="Across all tenants" icon={Users} />
        <KpiCard title="Total Categories" value={formatNumber(data.stats.categories)} rawValue={data.stats.categories} emptyMessage="No departments created" hint="Departments configured" icon={FolderKanban} />
        <KpiCard title="Daily Requirements" value={formatNumber(data.stats.dailyRequirements)} rawValue={data.stats.dailyRequirements} emptyMessage="No requirements created today" hint="New requisitions today" icon={ClipboardList} accent="text-amber-600" />
        <KpiCard title="Documents" value={formatNumber(data.stats.documents)} rawValue={data.stats.documents} emptyMessage="No documents uploaded" hint="Files in the platform" icon={FileText} />
        <KpiCard title="Monthly Revenue" value={formatMoney(data.stats.monthlyRevenue)} rawValue={data.stats.monthlyRevenue} emptyMessage="No active subscription revenue" hint="Active subscription MRR" icon={Banknote} accent="text-emerald-600" />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Recent Client Activity" description="Latest tenant updates and activity."><ActivityList items={data.recentClientActivity} empty="No client activity yet." /></Panel>
        <Panel title="New Client Onboarding" description="Newest subscriptions and plan assignments."><ActivityList items={data.onboarding} empty="No client onboarding records yet." /></Panel>
        <Panel title="Alerts" description="Inactive clients, errors, and operational risks."><ActivityList items={data.alerts} empty="No unresolved platform alerts." /></Panel>
      </div>

      <QuickActions actions={data.quickActions} />

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Employee Growth" description="Six-month employee footprint across tenants."><GrowthChart data={data.charts?.employeeGrowth} /></Panel>
        <Panel title="Timesheet Trends" description="Approved, pending, and rejected timesheet hours."><AttendanceTrend data={data.charts?.attendanceTrend} /></Panel>
        <Panel title="Payroll Distribution" description="Latest payroll mix by amount."><PayrollDistribution data={data.charts?.payrollDistribution} /></Panel>
      </div>
    </DashboardShell>
  );
}

function SuperAdminDashboard({ data }: { data: DashboardPayload }) {
  return (
    <DashboardShell title="Company Dashboard" subtitle="A practical operating dashboard for HR, payroll, hiring, documents, and daily work signals.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Total Employees" value={formatNumber(data.stats.employees)} rawValue={data.stats.employees} emptyMessage="No employees added yet" hint="Active company profiles" icon={Users} />
        <KpiCard title="Departments" value={formatNumber(data.stats.departments)} rawValue={data.stats.departments} emptyMessage="No departments created" hint="Categories configured" icon={FolderKanban} />
        <KpiCard title="Daily Requirements" value={formatNumber(data.stats.dailyRequirements)} rawValue={data.stats.dailyRequirements} emptyMessage="No requirements created today" hint="New requisitions today" icon={ClipboardList} />
        <KpiCard title="Pending Leaves" value={formatNumber(data.stats.pendingLeaves)} rawValue={data.stats.pendingLeaves} emptyMessage="No leave requests pending" hint="Awaiting approval" icon={CalendarClock} accent="text-amber-600" />
        <KpiCard title="Payroll Status" value={data.payroll ? statusText(data.payroll.status) : "Not started"} hint={data.payroll ? `${data.payroll.month}/${data.payroll.year}` : "No payroll run yet"} icon={Receipt} />
        <KpiCard title="Documents Uploaded" value={formatNumber(data.stats.documents)} rawValue={data.stats.documents} emptyMessage="No documents uploaded" hint="Company and employee docs" icon={FileText} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Timesheet Summary" description="Today's approved and pending project hours.">
          {data.timesheetSummary?.length ? (
            <div className="grid gap-2">
              {data.timesheetSummary.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold">{formatNumber(item.value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No timesheet entries submitted today.</p>
          )}
          <Link href={"/timesheets" as Route} className="mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-sm transition hover:bg-secondary/50">
            <span>Open timesheet approvals</span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <p className="mt-3 rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
            Payroll calculations use approved timesheet hours for this tenant.
          </p>
        </Panel>
        <Panel title="Open Job Positions" description="ATS demand currently active.">
          <div className="flex items-center justify-between rounded-md border px-4 py-4">
            <div>
              <p className="text-3xl font-semibold">{formatNumber(data.stats.openJobs)}</p>
              <p className="text-sm text-muted-foreground">{data.stats.openJobs === 0 ? "No active job openings" : "Open positions"}</p>
            </div>
            <BriefcaseBusiness className="h-10 w-10 text-primary" />
          </div>
          <Link href={"/ats" as Route} className="mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-sm transition hover:bg-secondary/50">
            <span>Review active hiring pipeline</span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
              <span className="text-muted-foreground">New requirements today</span>
              <span className="font-medium">{formatNumber(data.stats.dailyRequirements)}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
              <span className="text-muted-foreground">Payroll status</span>
              <span className="font-medium">{data.payroll ? statusText(data.payroll.status) : "Not started"}</span>
            </div>
          </div>
        </Panel>
        <Panel title="Recent Employee Activity" description="New employee records and timeline events.">
          <ActivityList items={data.recentEmployeeActivity} empty="No recent activity. Start by adding employees or assigning tasks." />
        </Panel>
      </div>

      <QuickActions actions={data.quickActions} />

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Employee Growth" description="Company headcount trend."><GrowthChart data={data.charts?.employeeGrowth} /></Panel>
        <Panel title="Timesheet Trends" description="Seven-day timesheet status trend."><AttendanceTrend data={data.charts?.attendanceTrend} /></Panel>
        <Panel title="Payroll Distribution" description="Latest payroll totals."><PayrollDistribution data={data.charts?.payrollDistribution} /></Panel>
      </div>
    </DashboardShell>
  );
}

function EmployeeDashboard({ data }: { data: DashboardPayload }) {
  return (
    <DashboardShell title="My Dashboard" subtitle="Your work hours, leave, payslips, documents, tasks, and announcements in one clean workspace.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Timesheet Summary" value={`${formatNumber(data.stats.timesheetHours)}h`} hint="Logged this month" icon={LineChart} />
        <KpiCard title="Pending Leave" value={formatNumber(data.stats.pendingLeaves)} hint="Requests in review" icon={CalendarClock} accent="text-amber-600" />
        <KpiCard title="Payslips" value={formatNumber(data.stats.payslips)} hint="Available salary slips" icon={Receipt} />
        <KpiCard title="Documents" value={formatNumber(data.stats.documents)} hint="Accessible files" icon={FileText} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Tasks" description="Open work and onboarding tasks.">
          {!data.tasks?.length ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No open tasks right now.</p> : (
            <div className="space-y-2">
              {data.tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{statusText(task.status)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Announcements" description="Company updates and HR notices.">
          <ActivityList items={(data.announcements || []).map((item) => ({ id: item.id, title: item.title, description: item.content }))} empty="No announcements available." />
        </Panel>
        <Panel title="Leave Balance" description="Remaining days by leave type.">
          {!data.leaveBalances?.length ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Leave balances are not allocated yet.</p> : (
            <div className="space-y-2">
              {data.leaveBalances.map((balance) => (
                <div key={balance.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{balance.leaveType}</span>
                  <span className="font-semibold">{formatNumber(balance.remaining)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <QuickActions actions={data.quickActions} />

      <Panel title="Timesheet Trend" description="Your seven-day work-hour status."><AttendanceTrend data={data.charts?.attendanceTrend} /></Panel>
    </DashboardShell>
  );
}

export default function DashboardPage() {
  const { data, loading, error } = useApi<DashboardPayload>("/api/dashboard/summary", []);

  if (loading) return <LoadingDashboard />;

  if (error || !data) {
    return (
      <DashboardShell title="Dashboard unavailable" subtitle="The dashboard could not load live metrics.">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />Unable to load dashboard</div>
          <p className="mt-1">{error || "No dashboard payload was returned."}</p>
        </div>
      </DashboardShell>
    );
  }

  if (data.role === "MASTER_ADMIN" || data.scope === "platform") return <MasterAdminDashboard data={data} />;
  if (data.role === "EMPLOYEE" || data.scope === "self") return <EmployeeDashboard data={data} />;
  return <SuperAdminDashboard data={data} />;
}

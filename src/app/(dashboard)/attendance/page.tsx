"use client";

import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils";

type MeResponse = { sub: string; role: string; email: string; name: string; tenantId?: string | null };
type TimesheetEntry = {
  id: string;
  userId: string;
  tenantId?: string | null;
  date: string;
  projectName: string;
  taskDescription: string;
  hoursWorked: string | number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | string;
  submittedAt?: string | null;
  rejectionReason?: string | null;
  user?: { name: string; email: string; employee?: { employeeCode: string; firstName: string; lastName: string } | null } | null;
  approver?: { name: string } | null;
};
type TimesheetResponse = {
  summary: {
    totalHours: number;
    approvedHours: number;
    pendingHours: number;
    submittedHours: number;
    draftHours: number;
    weeklyHours: number;
    pendingApprovals: number;
    approvedCount: number;
    submittedCount: number;
    pendingCount: number;
    draftCount: number;
    rejectedCount: number;
    approvalRate: number;
    approvalRatio: number;
    byStatus: Array<{ status: string; count: number; hours: number }>;
  };
  items: TimesheetEntry[];
  total: number;
};

const today = new Date().toISOString().slice(0, 10);
const defaultForm = { date: today, projectName: "", taskDescription: "", hoursWorked: "8" };

function statusTone(status: string) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (status === "REJECTED") return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
  if (status === "SUBMITTED") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  if (status === "DRAFT") return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200";
  return "bg-secondary text-secondary-foreground";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function employeeName(entry: TimesheetEntry) {
  const employee = entry.user?.employee;
  if (employee) return `${employee.firstName} ${employee.lastName}`;
  return entry.user?.name || "Employee";
}

export default function TimesheetPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState<TimesheetEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [rejecting, setRejecting] = useState<TimesheetEntry | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const { data: me } = useApi<MeResponse>("/api/auth/me", []);
  const role = me?.role || "EMPLOYEE";
  const canApprove = hasPermission(role, "timesheet:approve");
  const canCreateOwn = hasPermission(role, "timesheet:self");
  const mine = canApprove ? "0" : "1";
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "50", mine, refresh: String(refreshKey) });
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/timesheets?${params.toString()}`;
  }, [from, mine, q, refreshKey, status, to]);
  const { data, loading, error } = useApi<TimesheetResponse>(query, [query]);

  async function submitTimesheet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const payload = { ...form, hoursWorked: Number(form.hoursWorked) };
    const res = await fetch(editing ? `/api/timesheets/${editing.id}` : "/api/timesheets", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Unable to save timesheet");
    toast.success(editing ? "Timesheet draft updated" : "Timesheet draft saved");
    setForm(defaultForm);
    setEditing(null);
    setRefreshKey((key) => key + 1);
  }

  function editEntry(entry: TimesheetEntry) {
    setEditing(entry);
    setForm({
      date: new Date(entry.date).toISOString().slice(0, 10),
      projectName: entry.projectName,
      taskDescription: entry.taskDescription,
      hoursWorked: String(entry.hoursWorked)
    });
  }

  async function approve(id: string) {
    const res = await fetch(`/api/timesheets/${id}/approve`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Unable to approve timesheet");
    toast.success("Timesheet approved");
    setRefreshKey((key) => key + 1);
  }

  async function submitForApproval(id: string) {
    const res = await fetch(`/api/timesheets/${id}/submit`, { method: "PATCH" });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Unable to submit timesheet");
    toast.success("Timesheet submitted for approval");
    setRefreshKey((key) => key + 1);
  }

  async function reject() {
    if (!rejecting) return;
    const res = await fetch(`/api/timesheets/${rejecting.id}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: rejectComment })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Unable to reject timesheet");
    toast.success("Timesheet rejected");
    setRejecting(null);
    setRejectComment("");
    setRefreshKey((key) => key + 1);
  }

  const summary = data?.summary;

  return (
    <section className="min-w-0 space-y-4">
      <PageHeader
        title="Timesheets"
        subtitle="Daily project hours, manager approvals, and payroll-ready work records."
      />

      {error ? <Card className="text-sm text-destructive">Unable to load timesheets: {error}</Card> : null}

      <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["This week", `${summary?.weeklyHours ?? 0}h`],
          ["Total hours", `${summary?.totalHours ?? 0}h`],
          ["Pending approvals", summary?.pendingApprovals ?? 0],
          ["Approved", summary?.approvedCount ?? 0],
          ["Approval rate", `${summary?.approvalRate ?? summary?.approvalRatio ?? 0}%`]
        ].map(([label, value]) => (
          <Card key={label} className="transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs text-muted-foreground">{label}</p>
            {loading ? <Skeleton className="mt-3 h-8 w-20" /> : <p className="mt-3 text-2xl font-semibold">{value}</p>}
          </Card>
        ))}
      </div>

      <div className={cn("grid min-w-0 gap-4", canCreateOwn ? "xl:grid-cols-[380px_minmax(0,1fr)]" : "xl:grid-cols-1")}>
        {canCreateOwn ? (
          <Card>
            <form className="space-y-3" onSubmit={submitTimesheet}>
              <div>
                <p className="text-sm font-medium">{editing ? "Edit draft entry" : "New timesheet draft"}</p>
                <p className="text-xs text-muted-foreground">Save a draft first, then submit it for manager approval.</p>
              </div>
              <Input type="date" value={form.date} onChange={(event) => setForm((value) => ({ ...value, date: event.target.value }))} required />
              <Input value={form.projectName} onChange={(event) => setForm((value) => ({ ...value, projectName: event.target.value }))} placeholder="Project name" required />
              <Textarea value={form.taskDescription} onChange={(event) => setForm((value) => ({ ...value, taskDescription: event.target.value }))} placeholder="Task description" required />
              <Input type="number" min="0.25" max="24" step="0.25" value={form.hoursWorked} onChange={(event) => setForm((value) => ({ ...value, hoursWorked: event.target.value }))} placeholder="Hours worked" required />
              <div className="flex gap-2">
                {editing ? (
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditing(null); setForm(defaultForm); }} disabled={submitting}>
                    Cancel
                  </Button>
                ) : null}
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Saving..." : editing ? "Save Changes" : "Save Draft"}
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

        <Card className="min-w-0 space-y-3">
          <div className="grid gap-2 lg:grid-cols-[1fr_160px_150px_150px]">
            <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search project, task, or employee" />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" />
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="border-b bg-secondary/50 text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">Project / Task</th>
                  <th className="px-3 py-2 font-medium">Hours</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-3 py-3" colSpan={6}><Skeleton className="h-8 w-full" /></td>
                    </tr>
                  ))
                ) : (data?.items || []).map((entry) => (
                  <tr key={entry.id} className="border-b/50 hover:bg-secondary/40">
                    <td className="px-3 py-2">{formatDate(entry.date)}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{employeeName(entry)}</p>
                      <p className="text-xs text-muted-foreground">{entry.user?.employee?.employeeCode || entry.user?.email}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{entry.projectName}</p>
                      <p className="text-xs text-muted-foreground">{entry.taskDescription}</p>
                      {entry.rejectionReason ? <p className="mt-1 text-xs text-red-600">Rejected: {entry.rejectionReason}</p> : null}
                    </td>
                    <td className="px-3 py-2">{Number(entry.hoursWorked)}h</td>
                    <td className="px-3 py-2"><Badge className={statusTone(entry.status)}>{entry.status}</Badge></td>
                    <td className="px-3 py-2">
                      {canApprove && entry.status === "SUBMITTED" ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => approve(entry.id)} aria-label="Approve timesheet"><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="outline" onClick={() => setRejecting(entry)} aria-label="Reject timesheet"><X className="h-4 w-4" /></Button>
                        </div>
                      ) : canCreateOwn && entry.userId === me?.sub && ["DRAFT", "REJECTED"].includes(entry.status) ? (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => editEntry(entry)}><Pencil className="h-4 w-4" /> Edit</Button>
                          <Button size="sm" onClick={() => submitForApproval(entry.id)}>Submit</Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !data?.items?.length ? <p className="p-6 text-center text-sm text-muted-foreground">No timesheet entries found for the selected filters.</p> : null}
        </Card>
      </div>

      {rejecting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Card className="w-full max-w-md space-y-3">
            <div>
              <p className="font-semibold">Reject timesheet</p>
              <p className="text-sm text-muted-foreground">Add a clear reason so the employee can correct the entry.</p>
            </div>
            <Textarea value={rejectComment} onChange={(event) => setRejectComment(event.target.value)} placeholder="Reason for rejection" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRejecting(null); setRejectComment(""); }}>Cancel</Button>
              <Button variant="danger" onClick={reject}>Reject</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}

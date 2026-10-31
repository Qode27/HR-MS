"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, Download, FileText, Filter, XCircle } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function parseWorkflow(metaRaw?: string | null) {
  if (!metaRaw) return { stage: "MANAGER_PENDING", note: "" };
  try {
    return JSON.parse(metaRaw);
  } catch {
    return { stage: metaRaw, note: "" };
  }
}

function statusTone(status: LeaveStatus) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "REJECTED") return "bg-red-50 text-red-700 ring-red-200";
  if (status === "CANCELLED") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

export default function LeaveManagementPage() {
  const [filters, setFilters] = useState({ status: "", employeeId: "", departmentId: "", dateFrom: "", dateTo: "" });
  const query = useMemo(() => {
    const params = new URLSearchParams({ scope: "management" });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return `/api/leave?${params.toString()}`;
  }, [filters]);
  const { data, loading, error } = useApi<any>(query, [query]);

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    const note =
      decision === "REJECTED"
        ? window.prompt("Add a rejection reason for the employee:")
        : window.prompt("Optional admin note for this approval:") || "";
    if (decision === "REJECTED" && !note) return toast.error("A rejection reason is required.");

    const res = await fetch(`/api/leave/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed to update leave request");
    toast.success(decision === "APPROVED" ? "Leave approved" : "Leave rejected");
    window.location.reload();
  }

  function exportCsv() {
    const rows = data?.requests || [];
    if (!rows.length) return toast.error("No leave requests to export.");
    const csv = [
      ["Employee", "Code", "Department", "Leave Type", "Start", "End", "Status", "Workflow", "Reason"].join(","),
      ...rows.map((request: any) =>
        [
          `"${request.employee?.firstName || ""} ${request.employee?.lastName || ""}"`,
          request.employee?.employeeCode || "",
          `"${request.employee?.department?.name || ""}"`,
          `"${request.leaveType?.name || ""}"`,
          formatDate(request.startDate),
          formatDate(request.endDate),
          request.status,
          parseWorkflow(request.rejectionReason).stage,
          `"${request.reason || ""}"`
        ].join(",")
      )
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "leave-report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Leave Management"
        subtitle="Review tenant leave requests, approvals, balances, and calendar coverage."
        actions={<Button onClick={exportCsv} variant="outline"><Download className="h-4 w-4" /> Export Leave Report</Button>}
      />

      {error ? <Card className="border-red-200 bg-red-50 text-sm text-red-700">{error}</Card> : null}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Pending Approvals", data?.stats?.pending || 0, CalendarDays, "text-amber-600"],
          ["Approved Leaves", data?.stats?.approved || 0, CheckCircle2, "text-emerald-600"],
          ["Rejected Leaves", data?.stats?.rejected || 0, XCircle, "text-red-600"],
          ["Total Requests", data?.stats?.total || 0, FileText, "text-blue-600"]
        ].map(([label, value, Icon, color]) => (
          <Card key={String(label)} className="transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{String(label)}</p>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="mt-4 text-2xl font-semibold">{loading ? "..." : String(value)}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filters.employeeId} onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}>
            <option value="">All employees</option>
            {(data?.employees || []).map((employee: any) => (
              <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>
            ))}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filters.departmentId} onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}>
            <option value="">All departments</option>
            {(data?.departments || []).map((department: any) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
          <Button variant="outline" onClick={() => setFilters({ status: "", employeeId: "", departmentId: "", dateFrom: "", dateTo: "" })}>Reset</Button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b p-4">
            <p className="font-medium">All Employee Leave Requests</p>
            <p className="text-sm text-muted-foreground">Approve, reject with reason, and track workflow state.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-secondary/70 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Leave</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Workflow</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-4" colSpan={7}>Loading leave requests...</td>
                    </tr>
                  ))
                ) : (data?.requests || []).length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No leave requests match the current filters.</td></tr>
                ) : (
                  data.requests.map((request: any) => {
                    const workflow = parseWorkflow(request.rejectionReason);
                    return (
                      <tr key={request.id} className="border-t align-top">
                        <td className="px-4 py-3 font-medium">
                          {request.employee?.firstName} {request.employee?.lastName}
                          <div className="text-xs font-normal text-muted-foreground">{request.employee?.employeeCode}</div>
                        </td>
                        <td className="px-4 py-3">{request.employee?.department?.name || "Unassigned"}</td>
                        <td className="px-4 py-3">{request.leaveType?.name}<div className="text-xs text-muted-foreground">{request.reason || "No reason provided"}</div></td>
                        <td className="px-4 py-3">{formatDate(request.startDate)} to {formatDate(request.endDate)}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ring-1 ${statusTone(request.status)}`}>{request.status}</span></td>
                        <td className="px-4 py-3">
                          {workflow.stage}
                          {workflow.note ? <div className="text-xs text-muted-foreground">Note: {workflow.note}</div> : null}
                        </td>
                        <td className="px-4 py-3">
                          {request.status === "PENDING" ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => decide(request.id, "REJECTED")}>Reject</Button>
                              <Button size="sm" onClick={() => decide(request.id, "APPROVED")}>Approve</Button>
                            </div>
                          ) : <p className="text-right text-xs text-muted-foreground">Processed</p>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="font-medium">Leave Calendar</p>
            <div className="mt-3 space-y-2">
              {(data?.requests || []).filter((request: any) => request.status === "APPROVED").slice(0, 8).map((request: any) => (
                <div key={request.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{request.employee?.firstName} {request.employee?.lastName}</p>
                  <p className="text-muted-foreground">{formatDate(request.startDate)} to {formatDate(request.endDate)} · {request.leaveType?.name}</p>
                </div>
              ))}
              {!loading && !(data?.requests || []).some((request: any) => request.status === "APPROVED") ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No approved leaves on the calendar yet.</p>
              ) : null}
            </div>
          </Card>

          <Card>
            <p className="font-medium">Employee Leave Balance</p>
            <div className="mt-3 max-h-80 space-y-2 overflow-auto">
              {(data?.balances || []).slice(0, 30).map((balance: any) => (
                <div key={balance.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <p className="font-medium">{balance.employee?.firstName} {balance.employee?.lastName}</p>
                    <p className="text-muted-foreground">{balance.leaveType?.name}</p>
                  </div>
                  <p className="font-semibold">{Number(balance.allocated) - Number(balance.used)} days</p>
                </div>
              ))}
              {!loading && !(data?.balances || []).length ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No leave balances configured yet.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

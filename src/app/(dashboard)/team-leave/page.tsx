"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, XCircle } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function workflowLabel(metaRaw?: string | null) {
  if (!metaRaw) return "Manager review";
  try {
    const parsed = JSON.parse(metaRaw);
    if (parsed?.stage === "MANAGER_PENDING") return "Needs your decision";
    if (parsed?.stage === "HR_PENDING") return "Sent to HR";
    if (parsed?.stage === "COMPLETED") return "Approved";
    if (parsed?.stage === "REJECTED") return "Rejected";
    return parsed?.stage || "In review";
  } catch {
    return metaRaw;
  }
}

export default function TeamLeavePage() {
  const [status, setStatus] = useState("");
  const url = `/api/leave?scope=team${status ? `&status=${status}` : ""}`;
  const { data, loading, error } = useApi<any>(url, [url]);

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    const note = decision === "REJECTED" ? window.prompt("Add a rejection reason:") : "";
    if (decision === "REJECTED" && !note) return toast.error("A rejection reason is required.");
    const res = await fetch(`/api/leave/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed to update request");
    toast.success(decision === "APPROVED" ? "Request approved and sent to HR" : "Request rejected");
    window.location.reload();
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Team Leave" subtitle="Approve or reject leave requests for your direct reports." />
      {error ? <Card className="border-red-200 bg-red-50 text-sm text-red-700">{error}</Card> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-muted-foreground">Pending</p><p className="mt-4 text-2xl font-semibold">{loading ? "..." : data?.stats?.pending || 0}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Approved</p><p className="mt-4 text-2xl font-semibold">{loading ? "..." : data?.stats?.approved || 0}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Rejected</p><p className="mt-4 text-2xl font-semibold">{loading ? "..." : data?.stats?.rejected || 0}</p></Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Team Leave Requests</p>
            <p className="text-sm text-muted-foreground">Managers can only see requests for employees assigned to them.</p>
          </div>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {loading ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Loading team leave requests...</p> : null}
        {!loading && (data?.requests || []).length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No team leave requests match this view.</p> : null}
        <div className="space-y-3">
          {(data?.requests || []).map((request: any) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm">
              <div>
                <p className="font-medium">{request.employee?.firstName} {request.employee?.lastName}</p>
                <p className="text-muted-foreground">{request.leaveType?.name} · {formatDate(request.startDate)} to {formatDate(request.endDate)}</p>
                <p className="text-xs text-muted-foreground">{workflowLabel(request.rejectionReason)}</p>
              </div>
              {request.status === "PENDING" && workflowLabel(request.rejectionReason) === "Needs your decision" ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => decide(request.id, "REJECTED")}><XCircle className="h-4 w-4" /> Reject</Button>
                  <Button size="sm" onClick={() => decide(request.id, "APPROVED")}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs"><CalendarDays className="h-3 w-3" /> {request.status}</span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

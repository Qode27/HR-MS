"use client";

import Link from "next/link";
import { toast } from "sonner";
import { CalendarPlus, Clock, FileText } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function stageOf(metaRaw?: string | null) {
  if (!metaRaw) return "Awaiting manager review";
  try {
    const parsed = JSON.parse(metaRaw);
    if (parsed?.stage === "MANAGER_PENDING") return "Awaiting manager review";
    if (parsed?.stage === "HR_PENDING") return "Awaiting HR review";
    if (parsed?.stage === "COMPLETED") return "Approved";
    if (parsed?.stage === "REJECTED") return "Rejected";
    return parsed?.stage || "In review";
  } catch {
    return metaRaw;
  }
}

export default function MyLeavePage() {
  const { data, loading, error } = useApi<any>("/api/leave?scope=self", []);
  const pendingCount = (data?.requests || []).filter((request: any) => request.status === "PENDING").length;

  async function cancelRequest(id: string) {
    if (!window.confirm("Cancel this pending leave request?")) return;
    const res = await fetch(`/api/leave/${id}/cancel`, { method: "PATCH" });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed to cancel leave request");
    toast.success("Leave request cancelled");
    window.location.reload();
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="My Leave"
        subtitle="Apply for time off, track your history, and review remaining balances."
        actions={<Link href="/my-leave/apply"><Button><CalendarPlus className="h-4 w-4" /> Apply Leave</Button></Link>}
      />
      {error ? <Card className="border-red-200 bg-red-50 text-sm text-red-700">{error}</Card> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pending Requests</p>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-4 text-2xl font-semibold">{loading ? "..." : pendingCount}</p>
        </Card>
        {(data?.balances || []).slice(0, 2).map((balance: any) => (
          <Card key={balance.id}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{balance.leaveType?.name}</p>
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <p className="mt-4 text-2xl font-semibold">{Number(balance.allocated) - Number(balance.used)} days</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <p className="mb-3 font-medium">My Leave Balance</p>
          {(data?.balances || []).length === 0 && !loading ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Leave balances are not allocated yet.</p> : null}
          {(data?.balances || []).map((balance: any) => (
            <div key={balance.id} className="mb-2 flex items-center justify-between rounded border p-3 text-sm">
              <span>{balance.leaveType?.name}</span>
              <span className="font-semibold">{Number(balance.allocated) - Number(balance.used)} days remaining</span>
            </div>
          ))}
        </Card>

        <Card>
          <p className="mb-3 font-medium">My Leave History</p>
          {loading ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Loading your leave history...</p> : null}
          {!loading && (data?.requests || []).length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No leave requests yet. Apply when you need time off.</p> : null}
          {(data?.requests || []).map((request: any) => (
            <div key={request.id} className="mb-2 rounded border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{request.leaveType?.name}</p>
                <span className="rounded-full bg-secondary px-2 py-1 text-xs">{request.status}</span>
              </div>
              <p className="mt-1 text-muted-foreground">{formatDate(request.startDate)} to {formatDate(request.endDate)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Workflow: {stageOf(request.rejectionReason)}</p>
              {request.status === "PENDING" ? (
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => cancelRequest(request.id)}>Cancel Request</Button>
                </div>
              ) : null}
            </div>
          ))}
        </Card>
      </div>
    </section>
  );
}

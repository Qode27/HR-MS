"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDemoMode } from "@/lib/demo";

function stageOf(metaRaw?: string | null) {
  if (!metaRaw) return "-";
  try {
    const parsed = JSON.parse(metaRaw);
    return parsed?.stage || "-";
  } catch {
    return metaRaw;
  }
}

export default function LeavePage() {
  const { data } = useApi<any>("/api/leave", []);
  const isDemo = useDemoMode();
  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    const res = await fetch(`/api/leave/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success(isDemo ? "Demo mode: action not saved" : `Leave ${decision.toLowerCase()}`);
    window.location.reload();
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Leave Dashboard" subtitle="Balances and leave request history" actions={<Link href="/leave/apply"><Button>Apply Leave</Button></Link>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 text-sm font-medium">Leave Balances</p>
          {(data?.balances || []).map((b: any) => (
            <div key={b.id} className="mb-2 flex items-center justify-between rounded border p-2 text-sm">
              <span>{b.leaveType.name}</span>
              <span>{Number(b.allocated) - Number(b.used)}</span>
            </div>
          ))}
        </Card>
        <Card>
          <p className="mb-3 text-sm font-medium">Requests</p>
          {(data?.requests || []).map((r: any) => (
            <div key={r.id} className="mb-2 rounded border p-2 text-sm">
              {new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()} ({r.status})
              <div className="text-xs text-muted-foreground">Workflow: {stageOf(r.rejectionReason)}</div>
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <p className="mb-3 text-sm font-medium">Approval Queue</p>
        {(data?.approvalQueue || []).length === 0 ? <p className="text-sm text-muted-foreground">No pending approvals.</p> : null}
        {(data?.approvalQueue || []).map((r: any) => (
          <div key={r.id} className="mb-2 flex items-center justify-between rounded border p-2 text-sm">
            <div>
              {r.employee?.firstName} {r.employee?.lastName} - {r.leaveType?.name}
              <div className="text-xs text-muted-foreground">
                {new Date(r.startDate).toLocaleDateString()} to {new Date(r.endDate).toLocaleDateString()}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => decide(r.id, "REJECTED")}>Reject</Button>
              <Button size="sm" onClick={() => decide(r.id, "APPROVED")}>{isDemo ? "Approve demo" : "Approve"}</Button>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}

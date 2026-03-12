"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function AttendanceRegularizationPage() {
  const [payload, setPayload] = useState({ attendanceId: "", requestedCheckIn: "", requestedCheckOut: "", reason: "" });
  const mine = useApi<any[]>("/api/attendance/regularization?mine=1", [payload.attendanceId]);
  const pending = useApi<any[]>("/api/attendance/regularization?pending=1", []);

  async function submitRequest() {
    const res = await fetch("/api/attendance/regularization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success("Regularization requested");
    window.location.reload();
  }

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    const res = await fetch(`/api/attendance/regularization/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success(`Request ${decision.toLowerCase()}`);
    window.location.reload();
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Attendance Regularization" subtitle="Submit and review manual corrections" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <p className="text-sm font-medium">Request Correction</p>
          <Input placeholder="Attendance ID" value={payload.attendanceId} onChange={(e) => setPayload((p) => ({ ...p, attendanceId: e.target.value }))} />
          <Input type="datetime-local" value={payload.requestedCheckIn} onChange={(e) => setPayload((p) => ({ ...p, requestedCheckIn: e.target.value }))} />
          <Input type="datetime-local" value={payload.requestedCheckOut} onChange={(e) => setPayload((p) => ({ ...p, requestedCheckOut: e.target.value }))} />
          <Textarea placeholder="Reason" value={payload.reason} onChange={(e) => setPayload((p) => ({ ...p, reason: e.target.value }))} />
          <Button onClick={submitRequest}>Submit Request</Button>
        </Card>
        <Card>
          <p className="mb-2 text-sm font-medium">My Requests</p>
          <div className="space-y-2">
            {(mine.data || []).map((r: any) => (
              <div key={r.id} className="rounded border p-2 text-sm">
                {new Date(r.date).toLocaleDateString()} - {r.regularization?.status}
                <div className="text-xs text-muted-foreground">{r.regularization?.reason}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <p className="mb-2 text-sm font-medium">Pending Approvals</p>
        <div className="space-y-2">
          {(pending.data || []).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <div>
                {r.employee?.firstName} {r.employee?.lastName} - {new Date(r.date).toLocaleDateString()}
                <div className="text-xs text-muted-foreground">{r.regularization?.reason}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => decide(r.id, "REJECTED")}>Reject</Button>
                <Button size="sm" onClick={() => decide(r.id, "APPROVED")}>Approve</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useApi<any>(`/api/ats/candidates/${id}`, [id]);
  const [comment, setComment] = useState("");
  const [interview, setInterview] = useState({ scheduledAt: "", mode: "Video", panelists: "", notes: "" });

  async function moveToJoined() {
    await fetch(`/api/ats/candidates/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "JOINED" }) });
    window.location.reload();
  }

  async function convert() {
    await fetch(`/api/ats/candidates/${id}/convert`, { method: "POST" });
    window.location.reload();
  }

  async function addComment() {
    const res = await fetch(`/api/ats/candidates/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success("Comment added");
    setComment("");
    window.location.reload();
  }

  async function scheduleInterview() {
    const res = await fetch("/api/ats/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: id,
        jobOpeningId: data?.jobOpeningId,
        scheduledAt: interview.scheduledAt,
        mode: interview.mode,
        panelists: interview.panelists.split(",").map((p) => p.trim()).filter(Boolean),
        notes: interview.notes
      })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success("Interview scheduled");
    window.location.reload();
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Candidate Detail" subtitle={data?.fullName || "Loading..."} actions={<div className="flex gap-2"><Button variant="outline" onClick={moveToJoined}>Mark Joined</Button><Button onClick={convert}>Convert to Employee</Button></div>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded border p-2 text-sm">Email: {data?.email}</div>
            <div className="rounded border p-2 text-sm">Phone: {data?.phone || "-"}</div>
            <div className="rounded border p-2 text-sm">Stage: {data?.stage}</div>
            <div className="rounded border p-2 text-sm">Source: {data?.source}</div>
            <div className="rounded border p-2 text-sm md:col-span-2">Skills: {(data?.skills || []).join(", ") || "-"}</div>
          </div>
          <div className="rounded border p-3">
            <p className="mb-2 text-sm font-medium">Recruiter Notes</p>
            <div className="mb-2 space-y-2">
              {(data?.comments || []).map((c: any) => <p key={c.id} className="rounded border p-2 text-sm">{c.comment}</p>)}
            </div>
            <Textarea placeholder="Add note" value={comment} onChange={(e) => setComment(e.target.value)} />
            <Button className="mt-2" size="sm" onClick={addComment}>Add Comment</Button>
          </div>
          <div className="rounded border p-3 space-y-2">
            <p className="text-sm font-medium">Schedule Interview</p>
            <Input type="datetime-local" value={interview.scheduledAt} onChange={(e) => setInterview((p) => ({ ...p, scheduledAt: e.target.value }))} />
            <Input placeholder="Mode (Video/In-person)" value={interview.mode} onChange={(e) => setInterview((p) => ({ ...p, mode: e.target.value }))} />
            <Input placeholder="Panelists (comma separated)" value={interview.panelists} onChange={(e) => setInterview((p) => ({ ...p, panelists: e.target.value }))} />
            <Textarea placeholder="Notes" value={interview.notes} onChange={(e) => setInterview((p) => ({ ...p, notes: e.target.value }))} />
            <Button size="sm" onClick={scheduleInterview}>Schedule</Button>
          </div>
        </Card>
        <Card>
          <p className="mb-3 text-sm font-medium">Timeline</p>
          {(data?.activity || []).map((a: any) => <p key={a.id} className="mb-2 text-xs text-muted-foreground">{a.action}</p>)}
        </Card>
      </div>
    </section>
  );
}

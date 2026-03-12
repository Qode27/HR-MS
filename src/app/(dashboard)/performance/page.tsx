"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function PerformancePage() {
  const { data } = useApi<any>("/api/performance", []);
  const bootstrap = useApi<any>("/api/employees/bootstrap", []);
  const reviews = useApi<any[]>("/api/performance/reviews", []);
  const [form, setForm] = useState({ name: "Q2 2026", startDate: "2026-04-01", endDate: "2026-06-30", status: "DRAFT" });
  const [goal, setGoal] = useState({ employeeId: "", cycleId: "", title: "", description: "", targetValue: "", weight: "10" });
  const [review, setReview] = useState({ employeeId: "", cycleId: "", selfRating: "", managerRating: "", notes: "" });

  async function createCycle() {
    const res = await fetch("/api/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success("Cycle created");
    window.location.reload();
  }

  async function createGoal() {
    const res = await fetch("/api/performance/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...goal,
        targetValue: goal.targetValue ? Number(goal.targetValue) : undefined,
        weight: Number(goal.weight)
      })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success("Goal created");
    window.location.reload();
  }

  async function submitReview() {
    const res = await fetch("/api/performance/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...review,
        selfRating: review.selfRating ? Number(review.selfRating) : undefined,
        managerRating: review.managerRating ? Number(review.managerRating) : undefined
      })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success("Review submitted");
    window.location.reload();
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Performance" subtitle="Cycles, goals and review history" />
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-sm font-medium">Create Review Cycle</p>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cycle name" />
          <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          <Button onClick={createCycle}>Create</Button>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium">Assign Goal</p>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={goal.employeeId} onChange={(e) => setGoal((p) => ({ ...p, employeeId: e.target.value }))}>
            <option value="">Select employee</option>
            {(bootstrap.data?.managers || []).map((m: any) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={goal.cycleId} onChange={(e) => setGoal((p) => ({ ...p, cycleId: e.target.value }))}>
            <option value="">Select cycle</option>
            {(data?.cycles || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input placeholder="Goal title" value={goal.title} onChange={(e) => setGoal((p) => ({ ...p, title: e.target.value }))} />
          <Input placeholder="Target value" value={goal.targetValue} onChange={(e) => setGoal((p) => ({ ...p, targetValue: e.target.value }))} />
          <Input placeholder="Weight" value={goal.weight} onChange={(e) => setGoal((p) => ({ ...p, weight: e.target.value }))} />
          <Textarea placeholder="Description" value={goal.description} onChange={(e) => setGoal((p) => ({ ...p, description: e.target.value }))} />
          <Button onClick={createGoal}>Create Goal</Button>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium">Submit Review</p>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={review.employeeId} onChange={(e) => setReview((p) => ({ ...p, employeeId: e.target.value }))}>
            <option value="">Select employee</option>
            {(bootstrap.data?.managers || []).map((m: any) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={review.cycleId} onChange={(e) => setReview((p) => ({ ...p, cycleId: e.target.value }))}>
            <option value="">Select cycle</option>
            {(data?.cycles || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input placeholder="Self rating (1-5)" value={review.selfRating} onChange={(e) => setReview((p) => ({ ...p, selfRating: e.target.value }))} />
          <Input placeholder="Manager rating (1-5)" value={review.managerRating} onChange={(e) => setReview((p) => ({ ...p, managerRating: e.target.value }))} />
          <Textarea placeholder="Review notes" value={review.notes} onChange={(e) => setReview((p) => ({ ...p, notes: e.target.value }))} />
          <Button onClick={submitReview}>Submit Review</Button>
        </Card>
        <Card className="lg:col-span-4">
          <p className="mb-2 text-sm font-medium">Performance Cycles</p>
          <div className="space-y-2 text-sm">
            {(data?.cycles || []).map((c: any) => (
              <div key={c.id} className="rounded border p-2">
                <p className="font-medium">{c.name}</p>
                <p className="text-muted-foreground">{new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()} ({c.status})</p>
              </div>
            ))}
          </div>
          <p className="mb-2 mt-4 text-sm font-medium">Recent Reviews</p>
          <div className="space-y-2 text-sm">
            {(reviews.data || []).map((r: any) => (
              <div key={r.id} className="rounded border p-2">
                Employee: {r.employee?.employeeCode || r.employeeId} | Self: {r.selfRating ?? "-"} | Manager: {r.managerRating ?? "-"}
                <div className="text-xs text-muted-foreground">{r.notes || "-"}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

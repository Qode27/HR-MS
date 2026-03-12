"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";

export default function ApplyLeavePage() {
  const router = useRouter();
  const { data } = useApi<any>("/api/leave", []);
  const [form, setForm] = useState({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await res.json();
    setLoading(false);
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed to apply leave");
    toast.success("Leave request submitted");
    router.push("/leave");
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Apply Leave" subtitle="Submit leave request for approval" />
      <Card>
        <form className="grid gap-3" onSubmit={submit}>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })} required>
            <option value="">Select leave type</option>
            {(data?.leaveTypes || []).map((lt: any) => (
              <option key={lt.id} value={lt.id}>{lt.name}</option>
            ))}
          </select>
          <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
          <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
          <Textarea placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <Button disabled={loading}>{loading ? "Submitting..." : "Submit"}</Button>
        </form>
      </Card>
    </section>
  );
}

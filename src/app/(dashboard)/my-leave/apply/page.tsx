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

export default function ApplyMyLeavePage() {
  const router = useRouter();
  const { data } = useApi<any>("/api/leave?scope=self", []);
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
    router.push("/my-leave");
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Apply Leave" subtitle="Submit your leave request for manager and HR approval." />
      <Card>
        <form className="grid gap-3" onSubmit={submit}>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })} required>
            <option value="">Select leave type</option>
            {(data?.leaveTypes || []).map((leaveType: any) => (
              <option key={leaveType.id} value={leaveType.id}>{leaveType.name}</option>
            ))}
          </select>
          <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
          <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
          <Textarea placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <Button disabled={loading}>{loading ? "Submitting..." : "Submit Leave Request"}</Button>
        </form>
      </Card>
    </section>
  );
}

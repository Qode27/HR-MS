"use client";

import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const { data } = useApi<any[]>("/api/onboarding", []);

  async function move(id: string, status: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED") {
    const res = await fetch(`/api/onboarding/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success("Task updated");
    window.location.reload();
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Onboarding Tracker" subtitle="Cross-functional joining checklist" />
      <DataTable rows={(data || []).map((t) => ({ title: t.title, status: t.status, employee: t.employee?.employeeCode || "-", candidate: t.candidate?.fullName || "-" }))} columns={[{ key: "title", label: "Task" }, { key: "status", label: "Status" }, { key: "employee", label: "Employee" }, { key: "candidate", label: "Candidate" }]} />
      <Card>
        <p className="mb-2 text-sm font-medium">Task Actions</p>
        {(data || []).map((t) => (
          <div key={t.id} className="mb-2 flex items-center justify-between rounded border p-2 text-sm">
            <div>
              {t.title} - {t.status}
              <div className="text-xs text-muted-foreground">{t.employee?.employeeCode || t.candidate?.fullName || "-"}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => move(t.id, "TODO")}>Todo</Button>
              <Button size="sm" variant="outline" onClick={() => move(t.id, "IN_PROGRESS")}>In Progress</Button>
              <Button size="sm" variant="outline" onClick={() => move(t.id, "BLOCKED")}>Blocked</Button>
              <Button size="sm" onClick={() => move(t.id, "DONE")}>Done</Button>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}

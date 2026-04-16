"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function JobsPage() {
  const { data } = useApi<any[]>("/api/ats/jobs", []);
  const bootstrap = useApi<any>("/api/ats/jobs/bootstrap", []);
  const [form, setForm] = useState({ title: "", description: "", requisitionId: "", recruiterId: "", locationId: "", openingsCount: "1" });

  async function createJob() {
    const res = await fetch("/api/ats/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        requisitionId: form.requisitionId,
        recruiterId: form.recruiterId || undefined,
        locationId: form.locationId || undefined,
        openingsCount: Number(form.openingsCount)
      })
    });
    const json = await res.json();
    if (!res.ok || json.error) return toast.error(json.error?.message || json.error || "Unable to create job");
    toast.success("Job opening created");
    window.location.reload();
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/ats/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, closeDate: status === "CLOSED" ? new Date().toISOString() : "" })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Unable to update job");
    toast.success(status === "CLOSED" ? "Job closed" : "Job reopened");
    window.location.reload();
  }

  const rows = (data || []).map((job) => ({
    title: job.title,
    status: job.status,
    recruiter: job.recruiter?.fullName || "Unassigned",
    candidates: job.candidates?.length || 0
  }));

  return (
    <section className="space-y-4">
      <PageHeader title="Job Openings" subtitle="Create, review, and close active hiring positions with a clear owner." />

      <Card className="space-y-3">
        <div>
          <p className="text-sm font-medium">Create Job Opening</p>
          <p className="text-xs text-muted-foreground">Use an existing requisition to create a trackable opening for ATS operations.</p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <Input placeholder="Job title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.requisitionId} onChange={(e) => setForm((prev) => ({ ...prev, requisitionId: e.target.value, title: prev.title || bootstrap.data?.requisitions?.find((item: any) => item.id === e.target.value)?.title || "" }))}>
            <option value="">Select requisition</option>
            {(bootstrap.data?.requisitions || []).map((item: any) => (
              <option key={item.id} value={item.id}>{item.title} • {item.department.name}</option>
            ))}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.recruiterId} onChange={(e) => setForm((prev) => ({ ...prev, recruiterId: e.target.value }))}>
            <option value="">Assign recruiter</option>
            {(bootstrap.data?.recruiters || []).map((item: any) => (
              <option key={item.id} value={item.id}>{item.fullName}</option>
            ))}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.locationId} onChange={(e) => setForm((prev) => ({ ...prev, locationId: e.target.value }))}>
            <option value="">Location</option>
            {(bootstrap.data?.locations || []).map((item: any) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <Input placeholder="Openings" type="number" min="1" value={form.openingsCount} onChange={(e) => setForm((prev) => ({ ...prev, openingsCount: e.target.value }))} />
          <div className="md:col-span-2">
            <Input placeholder="Short job description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          </div>
        </div>
        <Button onClick={createJob} disabled={!form.requisitionId || !form.title || form.description.trim().length < 20}>Create Opening</Button>
      </Card>

      <DataTable rows={rows} columns={[{ key: "title", label: "Title" }, { key: "status", label: "Status" }, { key: "recruiter", label: "Recruiter" }, { key: "candidates", label: "Candidates" }]} />

      <div className="grid gap-3 md:grid-cols-2">
        {(data || []).map((job) => (
          <Card key={job.id} className="space-y-3">
            <div>
              <p className="font-medium">{job.title}</p>
              <p className="text-xs text-muted-foreground">{job.requisition?.departmentId ? `Requisition linked` : "No requisition details"}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Status: {job.status}</span>
              <span>Recruiter: {job.recruiter?.fullName || "Unassigned"}</span>
              <span>Candidates: {job.candidates?.length || 0}</span>
            </div>
            <div className="flex gap-2">
              <Link href={`/ats/jobs/${job.id}`} className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-secondary">View Details</Link>
              <Button size="sm" variant="outline" onClick={() => updateStatus(job.id, job.status === "CLOSED" ? "OPEN" : "CLOSED")}>
                {job.status === "CLOSED" ? "Reopen" : "Close"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

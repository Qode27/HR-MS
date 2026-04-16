"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function CandidateListPage() {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [source, setSource] = useState("all");
  const [form, setForm] = useState({ jobOpeningId: "", fullName: "", email: "", phone: "", currentLocation: "", noticePeriodDays: "", totalExperience: "", skills: "", education: "", source: "DIRECT" });
  const { data } = useApi<any[]>(`/api/ats/candidates?q=${encodeURIComponent(query)}`, [query]);
  const jobs = useApi<any[]>("/api/ats/jobs", []);

  const filteredRows = (data || []).filter((candidate) => {
    const matchesStage = stage === "all" || candidate.stage === stage;
    const matchesSource = source === "all" || candidate.source === source;
    return matchesStage && matchesSource;
  });

  async function createCandidate() {
    const res = await fetch("/api/ats/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobOpeningId: form.jobOpeningId,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        currentLocation: form.currentLocation || undefined,
        noticePeriodDays: form.noticePeriodDays ? Number(form.noticePeriodDays) : undefined,
        totalExperience: form.totalExperience ? Number(form.totalExperience) : undefined,
        skills: form.skills.split(",").map((item) => item.trim()).filter(Boolean),
        education: form.education || undefined,
        source: form.source
      })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Unable to add candidate");
    toast.success("Candidate added to pipeline");
    window.location.reload();
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Candidate List"
        subtitle="Track applications, search the funnel, and keep the pipeline operational."
        actions={<Link href="/ats/candidates/pipeline"><Button variant="outline">Open Pipeline</Button></Link>}
      />

      <Card className="space-y-3">
        <div>
          <p className="text-sm font-medium">Add Candidate</p>
          <p className="text-xs text-muted-foreground">Create a real pipeline record with job mapping, source, and hiring context.</p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.jobOpeningId} onChange={(e) => setForm((prev) => ({ ...prev, jobOpeningId: e.target.value }))}>
            <option value="">Select job opening</option>
            {(jobs.data || []).filter((job) => job.status === "OPEN").map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
          <Input placeholder="Full name" value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          <Input placeholder="Location" value={form.currentLocation} onChange={(e) => setForm((prev) => ({ ...prev, currentLocation: e.target.value }))} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.source} onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}>
            {["DIRECT", "REFERRAL", "LINKEDIN", "JOB_BOARD", "CAREERS_PORTAL", "AGENCY"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
          <Input placeholder="Notice period days" type="number" min="0" value={form.noticePeriodDays} onChange={(e) => setForm((prev) => ({ ...prev, noticePeriodDays: e.target.value }))} />
          <Input placeholder="Experience (years)" type="number" min="0" step="0.1" value={form.totalExperience} onChange={(e) => setForm((prev) => ({ ...prev, totalExperience: e.target.value }))} />
          <Input placeholder="Education" value={form.education} onChange={(e) => setForm((prev) => ({ ...prev, education: e.target.value }))} />
          <div className="md:col-span-2">
            <Input placeholder="Skills (comma separated)" value={form.skills} onChange={(e) => setForm((prev) => ({ ...prev, skills: e.target.value }))} />
          </div>
        </div>
        <Button onClick={createCandidate} disabled={!form.jobOpeningId || !form.fullName || !form.email}>Add Candidate</Button>
      </Card>

      <Card className="space-y-3">
        <div className="grid gap-2 md:grid-cols-3">
          <Input placeholder="Search by name, email, or skills" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="all">All stages</option>
            {["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "OFFERED", "JOINED", "REJECTED", "ON_HOLD"].map((value) => (
              <option key={value} value={value}>{value === "JOINED" ? "HIRED" : value.replaceAll("_", " ")}</option>
            ))}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All sources</option>
            {["DIRECT", "REFERRAL", "LINKEDIN", "JOB_BOARD", "CAREERS_PORTAL", "AGENCY"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
        </div>
        <DataTable rows={filteredRows.map((candidate) => ({ fullName: candidate.fullName, email: candidate.email, stage: candidate.stage === "JOINED" ? "HIRED" : candidate.stage, source: candidate.source, job: candidate.jobOpening?.title || "-" }))} columns={[{ key: "fullName", label: "Name" }, { key: "email", label: "Email" }, { key: "stage", label: "Stage" }, { key: "source", label: "Source" }, { key: "job", label: "Job" }]} />
      </Card>

      <div className="grid gap-2 md:grid-cols-2">
        {filteredRows.length > 0 ? (
          filteredRows.map((candidate) => (
            <Link key={candidate.id} href={`/ats/candidates/${candidate.id}`} className="cursor-pointer rounded-lg border p-3 text-sm hover:bg-secondary">
              Open {candidate.fullName}
            </Link>
          ))
        ) : (
          <Card className="md:col-span-2 text-sm text-muted-foreground">No candidates match the current search and filter criteria.</Card>
        )}
      </div>
    </section>
  );
}

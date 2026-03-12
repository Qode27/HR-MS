"use client";

import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";

export default function JobsPage() {
  const { data } = useApi<any[]>("/api/ats/jobs", []);
  const rows = (data || []).map((j) => ({ id: j.id, title: j.title, status: j.status, candidates: j.candidates?.length || 0 }));

  return (
    <section className="space-y-4">
      <PageHeader title="Job Openings" subtitle="Manage positions and requisitions" />
      <DataTable rows={rows} columns={[{ key: "id", label: "ID" }, { key: "title", label: "Title" }, { key: "status", label: "Status" }, { key: "candidates", label: "Candidates" }]} />
      <div className="grid gap-2 md:grid-cols-2">
        {(data || []).map((j) => <Link key={j.id} href={`/ats/jobs/${j.id}`} className="cursor-pointer rounded border p-3 text-sm hover:bg-secondary">Open {j.title}</Link>)}
      </div>
    </section>
  );
}

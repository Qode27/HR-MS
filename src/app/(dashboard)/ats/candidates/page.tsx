"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";

export default function CandidateListPage() {
  const [query, setQuery] = useState("");
  const { data } = useApi<any[]>(`/api/ats/candidates?q=${encodeURIComponent(query)}`, [query]);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Candidate List"
        subtitle="Search by skill, location, notice period"
        actions={<Input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />}
      />
      <DataTable rows={(data || []).map((c) => ({ id: c.id, fullName: c.fullName, email: c.email, stage: c.stage, source: c.source }))} columns={[{ key: "id", label: "ID" }, { key: "fullName", label: "Name" }, { key: "email", label: "Email" }, { key: "stage", label: "Stage" }, { key: "source", label: "Source" }]} />
      <div className="grid gap-2 md:grid-cols-2">
        {(data || []).map((c) => <Link key={c.id} href={`/ats/candidates/${c.id}`} className="cursor-pointer rounded border p-3 text-sm hover:bg-secondary">Open {c.fullName}</Link>)}
      </div>
      <Link href="/ats/candidates/pipeline"><Button variant="outline">Open Pipeline</Button></Link>
    </section>
  );
}

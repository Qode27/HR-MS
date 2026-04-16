"use client";

import { useParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useApi<any>(`/api/ats/jobs/${id}`, [id]);
  return (
    <section className="space-y-4">
      <PageHeader title="Job Opening Detail" subtitle={data?.title || "Loading..."} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-2 lg:col-span-2">
          <p className="text-sm font-medium">Role Summary</p>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded border p-2 text-sm">Status: {data?.status || "-"}</div>
            <div className="rounded border p-2 text-sm">Openings: {data?.openingsCount || 0}</div>
            <div className="rounded border p-2 text-sm">Candidates: {data?.candidates?.length || 0}</div>
            <div className="rounded border p-2 text-sm">Interviews: {data?.interviews?.length || 0}</div>
          </div>
          <div className="rounded border p-3 text-sm">
            <p className="font-medium">Description</p>
            <p className="mt-2 text-muted-foreground">{data?.description || "No description available."}</p>
          </div>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium">Hiring Activity</p>
          {(data?.candidates || []).length ? (
            data.candidates.map((candidate: any) => (
              <div key={candidate.id} className="rounded border p-2 text-sm">
                <p className="font-medium">{candidate.fullName}</p>
                <p className="text-xs text-muted-foreground">{candidate.stage === "JOINED" ? "HIRED" : candidate.stage}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No candidates mapped to this opening yet.</p>
          )}
        </Card>
      </div>
    </section>
  );
}

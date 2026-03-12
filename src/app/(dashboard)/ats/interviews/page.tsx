"use client";

import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default function InterviewsPage() {
  const { data } = useApi<any[]>("/api/ats/interviews", []);
  return (
    <section className="space-y-4">
      <PageHeader title="Interview Scheduler" subtitle="Panel assignments and feedback tracking" />
      <Card>
        <div className="space-y-2">
          {(data || []).map((x) => (
            <div key={x.id} className="rounded border p-2 text-sm">
              <div className="font-medium">{x.candidate?.fullName} - {x.jobOpening?.title}</div>
              <div className="text-xs text-muted-foreground">{new Date(x.scheduledAt).toLocaleString()} | {x.mode}</div>
              <div className="text-xs text-muted-foreground">Panel: {(x.panelists || []).join(", ") || "-"}</div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

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
      <Card><pre className="overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre></Card>
    </section>
  );
}

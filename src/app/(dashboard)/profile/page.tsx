"use client";

import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default function ProfilePage() {
  const { data } = useApi<any>("/api/auth/me", []);
  return (
    <section className="space-y-4">
      <PageHeader title="Profile" subtitle="Account and role details" />
      <Card><pre className="text-xs">{JSON.stringify(data, null, 2)}</pre></Card>
    </section>
  );
}

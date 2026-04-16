"use client";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";

export default function OffersPage() {
  const { data } = useApi<any[]>("/api/ats/candidates", []);
  const offers = (data || []).filter((candidate) => ["OFFERED", "JOINED"].includes(candidate.stage));

  return (
    <section className="space-y-4">
      <PageHeader title="Offer Management" subtitle="Track candidates in offered and hired states without exposing fake offer-generation actions." />
      <Card className="space-y-2">
        {offers.length > 0 ? (
          offers.map((candidate) => (
            <div key={candidate.id} className="rounded border p-3 text-sm">
              <p className="font-medium">{candidate.fullName}</p>
              <p className="text-xs text-muted-foreground">{candidate.email} • {candidate.stage === "JOINED" ? "HIRED" : candidate.stage}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No candidates are currently in the offer or hired stage.</p>
        )}
      </Card>
    </section>
  );
}

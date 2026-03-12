import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default function OffersPage() {
  return (
    <section className="space-y-4">
      <PageHeader title="Offer Management" subtitle="Prepare, send and track offers" />
      <Card>Offer workflow is available via ATS APIs and candidate detail transitions.</Card>
    </section>
  );
}

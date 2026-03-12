import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

const links = [
  ["Job Openings", "/ats/jobs"],
  ["Candidate List", "/ats/candidates"],
  ["Pipeline", "/ats/candidates/pipeline"],
  ["Interviews", "/ats/interviews"],
  ["Offers", "/ats/offers"]
] as const;

export default function AtsPage() {
  return (
    <section className="space-y-4">
      <PageHeader title="ATS Dashboard" subtitle="Integrated hiring pipeline and analytics" />
      <div className="grid gap-4 md:grid-cols-3">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="cursor-pointer">
            <Card className="h-full hover:-translate-y-0.5 transition">{label}</Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

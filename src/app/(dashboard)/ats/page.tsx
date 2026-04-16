"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";

const links = [
  ["Job Openings", "/ats/jobs"],
  ["Candidate List", "/ats/candidates"],
  ["Pipeline", "/ats/candidates/pipeline"],
  ["Interviews", "/ats/interviews"],
  ["Offers", "/ats/offers"]
] as const;

export default function AtsPage() {
  const jobs = useApi<any[]>("/api/ats/jobs", []);
  const candidates = useApi<any[]>("/api/ats/candidates", []);

  const openJobs = (jobs.data || []).filter((job) => job.status === "OPEN").length;
  const offeredCandidates = (candidates.data || []).filter((candidate) => candidate.stage === "OFFERED").length;
  const hiredCandidates = (candidates.data || []).filter((candidate) => candidate.stage === "JOINED").length;

  return (
    <section className="space-y-4">
      <PageHeader title="ATS Dashboard" subtitle="Commercial hiring workflow covering jobs, pipeline movement, interviews, offers, and hiring conversion." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-xs text-muted-foreground">Open Jobs</p><p className="text-2xl font-semibold">{openJobs}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Candidates in Offer Stage</p><p className="text-2xl font-semibold">{offeredCandidates}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Candidates Hired</p><p className="text-2xl font-semibold">{hiredCandidates}</p></Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="cursor-pointer">
            <Card className="h-full hover:-translate-y-0.5 transition">
              <p className="font-medium">{label}</p>
              <p className="mt-1 text-sm text-muted-foreground">Open the {label.toLowerCase()} workspace.</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

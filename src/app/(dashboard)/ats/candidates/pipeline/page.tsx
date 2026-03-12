"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { AtsKanban } from "@frontend/components/ats-kanban";
import { fetchAtsStages, fetchCandidates, updateCandidateStage, type Candidate, type RecruitmentStage } from "@frontend/services/hrms-api";

export default function CandidatePipelinePage() {
  const [rows, setRows] = useState<Candidate[]>([]);
  const [stages, setStages] = useState<RecruitmentStage[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [candidates, stageRows] = await Promise.all([fetchCandidates(), fetchAtsStages()]);
      setRows(candidates);
      setStages(stageRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onMove(candidateId: string, stage: string) {
    await updateCandidateStage(candidateId, stage);
    setRows((prev) => prev.map((row) => (row.id === candidateId ? { ...row, stage } : row)));
    toast.success("Candidate stage updated");
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Candidate Pipeline" subtitle="Drag and drop candidates across hiring stages" />
      {loading ? <div className="h-56 rounded-xl border shimmer animate-shimmer" /> : <AtsKanban candidates={rows} stages={stages} onMove={onMove} />}
    </section>
  );
}

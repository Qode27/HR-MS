"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import type { Candidate } from "@frontend/services/hrms-api";

export function AtsKanban({
  candidates,
  stages,
  onMove
}: {
  candidates: Candidate[];
  stages: Array<{ stage: string; label?: string }>;
  onMove: (candidateId: string, stage: string) => Promise<void>;
}) {
  const [movingId, setMovingId] = useState<string | null>(null);
  const stageKeys = stages.length > 0 ? stages.map((s) => s.stage) : ["APPLIED"];

  const grouped = useMemo(() => {
    const map: Record<string, Candidate[]> = {};
    for (const stage of stageKeys) map[stage] = [];
    for (const c of candidates) {
      const key = stageKeys.includes(c.stage) ? c.stage : stageKeys[0];
      map[key].push(c);
    }
    return map;
  }, [candidates, stageKeys]);

  async function drop(candidateId: string, stage: string) {
    setMovingId(candidateId);
    try {
      await onMove(candidateId, stage);
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div className="grid gap-3 overflow-x-auto pb-2 lg:grid-cols-4 2xl:grid-cols-8">
      {stages.map(({ stage, label }) => (
        <div
          key={stage}
          className="min-w-64 rounded-xl border bg-card/70 p-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const candidateId = e.dataTransfer.getData("candidateId");
            if (candidateId) void drop(candidateId, stage);
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">{label || stage.replaceAll("_", " ")}</h3>
            <span className="rounded bg-secondary px-2 py-0.5 text-xs">{grouped[stage]?.length || 0}</span>
          </div>
          <div className="space-y-2">
            {(grouped[stage] || []).map((c) => (
              <motion.div key={c.id} layout initial={{ opacity: 0.8 }} animate={{ opacity: 1 }}>
                <Card
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("candidateId", c.id)}
                  className="cursor-grab p-3 active:cursor-grabbing"
                >
                  <p className="text-sm font-medium">{c.fullName}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.source}</p>
                  {movingId === c.id ? <p className="mt-1 text-xs text-primary">Updating...</p> : null}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

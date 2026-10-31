import { api } from "@/lib/api-client";

export type Candidate = {
  id: string;
  fullName: string;
  email: string;
  stage: string;
  source: string;
  totalExperience?: number;
  currentLocation?: string;
};

export type RecruitmentStage = { stage: string; order: number; label: string };

export async function fetchCandidates(query = "") {
  const data = await api<{ items: Candidate[] }>(`/api/ats/candidates?search=${encodeURIComponent(query)}&limit=100`);
  return data.items;
}

export async function updateCandidateStage(candidateId: string, stage: string) {
  return api(`/api/ats/candidates/${candidateId}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ stage })
  });
}

export async function fetchDashboardSummary() {
  return api<{
    role?: string;
    stats: { employees: number; pendingLeaves: number; openPositions: number };
    candidatesByStage: Array<{ stage: string; _count: number }>;
    announcements: Array<{ id: string; title: string }>;
  }>("/api/dashboard/summary");
}

export async function fetchAtsStages() {
  return api<RecruitmentStage[]>("/api/ats/stages");
}

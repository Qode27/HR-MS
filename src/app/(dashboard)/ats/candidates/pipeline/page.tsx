"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Archive, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Download, Eye, ListChecks, Loader2, MessageSquarePlus, PanelRightOpen, Plus, Search, Table2, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type StageKey = "APPLIED" | "SCREENING" | "SHORTLISTED" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";
type CandidateStage = "APPLIED" | "SCREENING" | "SHORTLISTED" | "INTERVIEW_SCHEDULED" | "INTERVIEWED" | "SELECTED" | "OFFERED" | "JOINED" | "REJECTED" | "ON_HOLD";
type ViewMode = "pipeline" | "table" | "focus";

type Candidate = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  currentLocation?: string | null;
  totalExperience?: number | null;
  skills: string[];
  source: string;
  stage: CandidateStage;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  rating?: number;
  nextAction?: string | null;
  nextActionDate?: string | null;
  nextInterviewAt?: string | null;
  isOverdue?: boolean;
  needsReview?: boolean;
  workflowSection?: "Needs Action" | "Waiting" | "Completed";
  staleDays?: number;
  updatedAt: string;
  createdAt: string;
  resumePath?: string | null;
  rejectionReason?: string | null;
  tags?: string[];
  jobOpening?: { id: string; title: string; status?: string } | null;
  assignedRecruiter?: { id: string; fullName: string; email: string } | null;
  _count?: { comments: number; activity: number; interviews: number; documents: number };
  comments?: Array<{ id: string; comment: string; createdAt: string }>;
  activity?: Array<{ id: string; action: string; createdAt: string; meta?: unknown }>;
  interviews?: Array<{ id: string; scheduledAt: string; mode: string; notes?: string | null }>;
  documents?: Array<{ id: string; fileName?: string; originalName?: string; fileUrl?: string }>;
};

type PipelineStage = { key: StageKey; label: string; stages: CandidateStage[]; total: number; hasMore: boolean; items: Candidate[] };
type PipelineResponse = { view: "pipeline"; total: number; stages: PipelineStage[]; todayWork?: { needsAction: Candidate[]; overdue: Candidate[]; upcomingInterviews: Array<{ id: string; candidateId: string; fullName: string; jobTitle: string; scheduledAt: string; mode: string }> } };
type TableResponse = { view: string; page: number; limit: number; total: number; totalPages: number; counts: Array<{ key: string; label: string; count: number }>; items: Candidate[] };
type Job = { id: string; title: string; status: string };
type User = { id: string; fullName: string; email: string; role?: { name: string } };

const stageOptions: Array<{ value: CandidateStage; label: string }> = [
  { value: "APPLIED", label: "Applied" },
  { value: "SCREENING", label: "Screening" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "INTERVIEW_SCHEDULED", label: "Interview" },
  { value: "OFFERED", label: "Offer" },
  { value: "JOINED", label: "Hired" },
  { value: "REJECTED", label: "Rejected" }
];

const stageTone: Record<string, string> = {
  APPLIED: "bg-sky-50 text-sky-700 border-sky-200",
  SCREENING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SHORTLISTED: "bg-violet-50 text-violet-700 border-violet-200",
  INTERVIEW_SCHEDULED: "bg-amber-50 text-amber-800 border-amber-200",
  INTERVIEWED: "bg-amber-50 text-amber-800 border-amber-200",
  SELECTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OFFERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  JOINED: "bg-teal-50 text-teal-700 border-teal-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  ON_HOLD: "bg-slate-50 text-slate-700 border-slate-200"
};

const priorityTone: Record<string, string> = {
  HIGH: "border-red-300 bg-red-50 text-red-700",
  MEDIUM: "border-amber-300 bg-amber-50 text-amber-800",
  LOW: "border-slate-200 bg-slate-100 text-slate-700"
};

const sectionOrder = ["Needs Action", "Waiting", "Completed"] as const;

function displayDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function stageLabel(stage: string) {
  if (stage === "INTERVIEW_SCHEDULED" || stage === "INTERVIEWED") return "Interview";
  if (stage === "SELECTED" || stage === "OFFERED") return "Offer";
  if (stage === "JOINED") return "Hired";
  return stage.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function useDebounced(value: string, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [delay, value]);
  return debounced;
}

export default function CandidatePipelinePage() {
  const [view, setView] = useState<ViewMode>("pipeline");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [filters, setFilters] = useState({ jobId: "", stage: "", experienceMin: "", experienceMax: "", skills: "", location: "", source: "", recruiterId: "", dateFrom: "", dateTo: "", status: "active" });
  const [page, setPage] = useState(1);
  const [stageLimit, setStageLimit] = useState(20);
  const [pipeline, setPipeline] = useState<PipelineResponse | null>(null);
  const [table, setTable] = useState<TableResponse | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recruiters, setRecruiters] = useState<User[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [stageSearch, setStageSearch] = useState<Record<string, string>>({});
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [note, setNote] = useState("");
  const [bulkStage, setBulkStage] = useState<CandidateStage>("SCREENING");
  const [bulkRecruiter, setBulkRecruiter] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [cursorIndex, setCursorIndex] = useState(0);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      view,
      page: String(page),
      limit: "50",
      stageLimit: String(stageLimit),
      status: filters.status
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== "status") params.set(key, value);
    });
    return `/api/ats/candidates?${params.toString()}`;
  }, [debouncedSearch, filters, page, stageLimit, view]);

  async function load() {
    setLoading(true);
    try {
      const [candidateData, jobRows, userRows] = await Promise.all([
        api<PipelineResponse | TableResponse>(query),
        api<Job[]>("/api/ats/jobs"),
        api<{ recruiters: User[] }>("/api/ats/jobs/bootstrap").catch(() => ({ recruiters: [] }))
      ]);
      if (candidateData.view === "pipeline") {
        setPipeline(candidateData as PipelineResponse);
        setTable(null);
      } else {
        setTable(candidateData as TableResponse);
        setPipeline(null);
      }
      setJobs(jobRows.filter((job) => job.status !== "CLOSED"));
      setRecruiters(userRows.recruiters || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load candidates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [query]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT") return;
      const rows = allVisibleCandidates();
      if (!rows.length) return;
      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        setCursorIndex((value) => Math.min(value + 1, rows.length - 1));
      } else if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCursorIndex((value) => Math.max(value - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        void openCandidate(rows[Math.min(cursorIndex, rows.length - 1)]);
      } else if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        void moveCandidate(rows[Math.min(cursorIndex, rows.length - 1)], "SCREENING");
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        void moveCandidate(rows[Math.min(cursorIndex, rows.length - 1)], "REJECTED");
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        void openCandidate(rows[Math.min(cursorIndex, rows.length - 1)]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cursorIndex, pipeline, table]);

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  async function openCandidate(candidate: Candidate) {
    setActiveCandidate(candidate);
    setDrawerLoading(true);
    try {
      setActiveCandidate(await api<Candidate>(`/api/ats/candidates/${candidate.id}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open candidate");
    } finally {
      setDrawerLoading(false);
    }
  }

  async function moveCandidate(candidate: Candidate, stage: CandidateStage) {
    const previous = pipeline;
    setMovingId(candidate.id);
    if (pipeline) {
      setPipeline({
        ...pipeline,
        stages: pipeline.stages.map((column) => ({
          ...column,
          items: column.items.filter((item) => item.id !== candidate.id).concat(column.stages.includes(stage) ? [{ ...candidate, stage, nextAction: stageLabel(stage), priority: ["INTERVIEW_SCHEDULED", "OFFERED"].includes(stage) ? "HIGH" : candidate.priority }] : [])
        }))
      });
    }
    try {
      const updated = await api<Candidate>(`/api/ats/candidates/${candidate.id}/stage`, { method: "PATCH", body: JSON.stringify({ stage }) });
      toast.success(`${candidate.fullName} moved to ${stageLabel(stage)}`);
      if (activeCandidate?.id === candidate.id) setActiveCandidate(updated);
      void load();
    } catch (error) {
      if (previous) setPipeline(previous);
      toast.error(error instanceof Error ? error.message : "Stage update failed");
    } finally {
      setMovingId(null);
    }
  }

  async function bulk(action: "move" | "assign" | "reject" | "tag") {
    const ids = Array.from(selected);
    if (!ids.length) return toast.error("Select candidates first");
    try {
      await api("/api/ats/candidates/bulk", {
        method: "PATCH",
        body: JSON.stringify({ ids, action, stage: bulkStage, recruiterId: bulkRecruiter || undefined, tag: bulkTag || undefined, rejectionReason: action === "reject" ? "Rejected during bulk processing" : undefined })
      });
      toast.success(`Bulk ${action} completed for ${ids.length} candidates`);
      setSelected(new Set());
      setRejectConfirm(false);
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk action failed");
    }
  }

  function exportSelectedCsv() {
    const rows = allVisibleCandidates().filter((candidate) => selected.has(candidate.id));
    if (!rows.length) return toast.error("Select candidates to export");
    const csv = ["Name,Email,Phone,Job,Stage,Experience,Recruiter,Updated"].concat(
      rows.map((candidate) => [
        candidate.fullName,
        candidate.email,
        candidate.phone || "",
        candidate.jobOpening?.title || "",
        candidate.stage,
        candidate.totalExperience ?? "",
        candidate.assignedRecruiter?.fullName || "",
        displayDate(candidate.updatedAt)
      ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    ).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "selected-candidates.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCandidate || !note.trim()) return;
    try {
      await api(`/api/ats/candidates/${activeCandidate.id}/notes`, { method: "POST", body: JSON.stringify({ comment: note.trim() }) });
      toast.success("Note added");
      setNote("");
      await openCandidate(activeCandidate);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add note");
    }
  }

  function allVisibleCandidates() {
    if (pipeline) return pipeline.stages.flatMap((stage) => stage.items);
    return table?.items || [];
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedCount = selected.size;
  const visibleCandidates = allVisibleCandidates();
  const focusCandidate = activeCandidate || visibleCandidates[Math.min(cursorIndex, Math.max(visibleCandidates.length - 1, 0))] || null;

  return (
    <section className="min-w-0 space-y-4">
      <PageHeader
        title="Candidate Pipeline"
        subtitle="High-volume hiring workspace for screening, stage movement, interviews, and bulk processing."
        actions={<Button size="sm" onClick={() => window.location.href = "/ats/candidates"}><Plus className="h-4 w-4" /> Add Candidate</Button>}
      />

      <Card className="sticky top-28 z-20 space-y-3 border-slate-200 bg-white/90 backdrop-blur">
        <div className="grid gap-2 xl:grid-cols-[minmax(260px,1.2fr)_repeat(5,minmax(130px,1fr))]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone, skills, resume text" />
          </label>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.jobId} onChange={(event) => updateFilter("jobId", event.target.value)}>
            <option value="">All jobs</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.stage} onChange={(event) => updateFilter("stage", event.target.value)}>
            <option value="">All stages</option>
            <option value="APPLIED">Applied</option>
            <option value="SCREENING">Screening</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="INTERVIEW">Interview</option>
            <option value="OFFER">Offer</option>
            <option value="HIRED">Hired</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <Input value={filters.skills} onChange={(event) => updateFilter("skills", event.target.value)} placeholder="Skills" />
          <Input value={filters.location} onChange={(event) => updateFilter("location", event.target.value)} placeholder="Location" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="active">Active</option>
            <option value="">All statuses</option>
            <option value="rejected">Rejected</option>
            <option value="hired">Hired</option>
          </select>
        </div>
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-[120px_120px_150px_150px_1fr_auto]">
          <Input type="number" value={filters.experienceMin} onChange={(event) => updateFilter("experienceMin", event.target.value)} placeholder="Min exp" />
          <Input type="number" value={filters.experienceMax} onChange={(event) => updateFilter("experienceMax", event.target.value)} placeholder="Max exp" />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.source} onChange={(event) => updateFilter("source", event.target.value)}>
            <option value="">All sources</option>
            {["CAREERS_PORTAL", "REFERRAL", "LINKEDIN", "JOB_BOARD", "DIRECT", "AGENCY"].map((source) => <option key={source} value={source}>{stageLabel(source)}</option>)}
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.recruiterId} onChange={(event) => updateFilter("recruiterId", event.target.value)}>
            <option value="">All recruiters</option>
            {recruiters.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
          </select>
          <div className="flex gap-2">
            <Input type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} aria-label="Application date from" />
            <Input type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} aria-label="Application date to" />
          </div>
          <div className="flex rounded-md border bg-background p-1">
            {(["pipeline", "table", "focus"] as ViewMode[]).map((mode) => (
              <button key={mode} className={cn("inline-flex h-8 items-center gap-1 rounded px-3 text-xs font-medium transition", view === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")} onClick={() => { setView(mode); setPage(1); }}>
                {mode === "pipeline" ? <PanelRightOpen className="h-3.5 w-3.5" /> : mode === "table" ? <Table2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {mode}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {selectedCount ? (
        <Card className="flex flex-wrap items-center gap-2 border-blue-200 bg-blue-50/80">
          <span className="text-sm font-medium text-blue-900">{selectedCount} selected</span>
          <select className="h-9 rounded-md border bg-white px-2 text-sm" value={bulkStage} onChange={(event) => setBulkStage(event.target.value as CandidateStage)}>
            {stageOptions.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
          </select>
          <Button size="sm" onClick={() => bulk("move")}><ListChecks className="h-4 w-4" /> Move</Button>
          <select className="h-9 rounded-md border bg-white px-2 text-sm" value={bulkRecruiter} onChange={(event) => setBulkRecruiter(event.target.value)}>
            <option value="">Recruiter</option>
            {recruiters.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => bulk("assign")}><UserCheck className="h-4 w-4" /> Assign</Button>
          <Input className="h-9 w-36 bg-white" value={bulkTag} onChange={(event) => setBulkTag(event.target.value)} placeholder="Tag" />
          <Button size="sm" variant="outline" onClick={() => bulk("tag")}>Add tag</Button>
          <Button size="sm" variant="outline" onClick={exportSelectedCsv}><Download className="h-4 w-4" /> CSV</Button>
          <Button size="sm" variant="danger" onClick={() => setRejectConfirm(true)}><Archive className="h-4 w-4" /> Reject</Button>
        </Card>
      ) : null}

      {view === "pipeline" && pipeline?.todayWork ? (
        <div className="grid gap-3 lg:grid-cols-3">
          <TodayPanel title="Needs action today" tone="red" items={pipeline.todayWork.needsAction} onOpen={openCandidate} />
          <TodayPanel title="Overdue candidates" tone="amber" items={pipeline.todayWork.overdue} onOpen={openCandidate} />
          <Card className="space-y-2 border-blue-200 bg-blue-50/60">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-blue-950">Upcoming interviews</p>
              <CalendarClock className="h-4 w-4 text-blue-700" />
            </div>
            {pipeline.todayWork.upcomingInterviews.length ? pipeline.todayWork.upcomingInterviews.slice(0, 4).map((item) => (
              <button key={item.id} className="w-full rounded-md bg-white p-2 text-left text-sm shadow-sm hover:bg-blue-50" onClick={() => {
                const candidate = visibleCandidates.find((row) => row.id === item.candidateId);
                if (candidate) void openCandidate(candidate);
              }}>
                <span className="block font-medium">{item.fullName}</span>
                <span className="block text-xs text-muted-foreground">{item.jobTitle} · {displayDate(item.scheduledAt)}</span>
              </button>
            )) : <p className="rounded-md border border-dashed bg-white/70 p-3 text-sm text-muted-foreground">No interviews in the next 7 days.</p>}
          </Card>
        </div>
      ) : null}

      {loading ? <Skeleton className="h-[520px] w-full rounded-xl" /> : view === "pipeline" && pipeline ? (
        <div className="flex min-w-0 gap-3 overflow-x-auto pb-3">
          {pipeline.stages.map((stage) => {
            const isCollapsed = collapsed.has(stage.key);
            const localSearch = stageSearch[stage.key]?.toLowerCase() || "";
            const items = stage.items.filter((candidate) => !localSearch || `${candidate.fullName} ${candidate.email} ${candidate.skills.join(" ")}`.toLowerCase().includes(localSearch));
            return (
              <div key={stage.key} className={cn("flex max-h-[calc(100vh-320px)] min-h-[420px] shrink-0 flex-col rounded-lg border bg-slate-50/80 transition-all", isCollapsed ? "w-16" : "w-[310px]")}>
                <button className="flex items-center justify-between border-b px-3 py-2 text-left" onClick={() => setCollapsed((current) => {
                  const next = new Set(current);
                  next.has(stage.key) ? next.delete(stage.key) : next.add(stage.key);
                  return next;
                })}>
                  <span className={cn("text-sm font-semibold", isCollapsed && "[writing-mode:vertical-rl] whitespace-nowrap")}>{stage.label}</span>
                  {!isCollapsed ? <Badge>{stage.total}</Badge> : <ChevronDown className="h-4 w-4" />}
                </button>
                {!isCollapsed ? (
                  <>
                    <div className="border-b bg-white/70 p-2">
                      <Input className="h-8" placeholder={`Search ${stage.label}`} value={stageSearch[stage.key] || ""} onChange={(event) => setStageSearch((current) => ({ ...current, [stage.key]: event.target.value }))} />
                    </div>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                      const id = event.dataTransfer.getData("candidateId");
                      const candidate = allVisibleCandidates().find((row) => row.id === id);
                      if (candidate) void moveCandidate(candidate, stage.stages[0]);
                    }}>
                      {sectionOrder.map((section) => {
                        const sectionItems = items.filter((candidate) => (candidate.workflowSection || "Waiting") === section);
                        if (!sectionItems.length) return null;
                        return (
                          <div key={section} className="space-y-2">
                            <div className="sticky top-0 z-10 flex items-center justify-between rounded bg-slate-100/95 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <span>{section}</span>
                              <span>{sectionItems.length}</span>
                            </div>
                            {sectionItems.map((candidate) => (
                              <CandidateCard key={candidate.id} candidate={candidate} selected={selected.has(candidate.id)} focused={visibleCandidates[cursorIndex]?.id === candidate.id} moving={movingId === candidate.id} onSelect={() => toggleSelected(candidate.id)} onOpen={() => openCandidate(candidate)} onMove={(next) => moveCandidate(candidate, next)} onQuickNote={() => { setActiveCandidate(candidate); setNote(""); }} onReject={() => moveCandidate(candidate, "REJECTED")} />
                            ))}
                          </div>
                        );
                      })}
                      {!items.length ? <p className="rounded-md border border-dashed bg-white p-4 text-center text-sm text-muted-foreground">No candidates in {stage.label.toLowerCase()}.</p> : null}
                    </div>
                    {stage.hasMore ? <button className="border-t bg-white py-2 text-sm font-medium text-primary hover:bg-secondary" onClick={() => setStageLimit((value) => Math.min(value + 20, 100))}>Load more</button> : null}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : view === "table" && table ? (
        <CandidateTable candidates={table.items} selected={selected} focusedId={visibleCandidates[cursorIndex]?.id} onSelect={toggleSelected} onOpen={openCandidate} onMove={moveCandidate} page={page} totalPages={table.totalPages} setPage={setPage} />
      ) : (
        <FocusView candidate={focusCandidate} onOpen={openCandidate} onMove={moveCandidate} />
      )}

      <CandidateDrawer candidate={activeCandidate} loading={drawerLoading} note={note} setNote={setNote} addNote={addNote} close={() => setActiveCandidate(null)} onMove={(candidate, stage) => moveCandidate(candidate, stage)} />

      {rejectConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <Card className="w-full max-w-md space-y-4 bg-white">
            <div>
              <p className="text-lg font-semibold">Reject selected candidates?</p>
              <p className="text-sm text-muted-foreground">This moves {selectedCount} candidate{selectedCount === 1 ? "" : "s"} to Rejected and records a bulk action.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectConfirm(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => bulk("reject")}>Reject candidates</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}

function TodayPanel({ title, tone, items, onOpen }: { title: string; tone: "red" | "amber"; items: Candidate[]; onOpen: (candidate: Candidate) => void }) {
  return (
    <Card className={cn("space-y-2", tone === "red" ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60")}>
      <div className="flex items-center justify-between">
        <p className={cn("text-sm font-semibold", tone === "red" ? "text-red-950" : "text-amber-950")}>{title}</p>
        <Badge className={tone === "red" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}>{items.length}</Badge>
      </div>
      {items.length ? items.slice(0, 4).map((candidate) => (
        <button key={candidate.id} className="w-full rounded-md bg-white p-2 text-left text-sm shadow-sm hover:bg-secondary/50" onClick={() => onOpen(candidate)}>
          <span className="block font-medium">{candidate.fullName}</span>
          <span className="block text-xs text-muted-foreground">{candidate.nextAction || "Review candidate"} · {candidate.jobOpening?.title || "Open role"}</span>
        </button>
      )) : <p className="rounded-md border border-dashed bg-white/70 p-3 text-sm text-muted-foreground">Nothing urgent here.</p>}
    </Card>
  );
}

function CandidateCard({ candidate, selected, focused, moving, onSelect, onOpen, onMove, onQuickNote, onReject }: { candidate: Candidate; selected: boolean; focused?: boolean; moving: boolean; onSelect: () => void; onOpen: () => void; onMove: (stage: CandidateStage) => void; onQuickNote: () => void; onReject: () => void }) {
  return (
    <div draggable onDragStart={(event) => event.dataTransfer.setData("candidateId", candidate.id)} className={cn("rounded-lg border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", candidate.priority === "HIGH" && "border-red-300", candidate.isOverdue && "ring-1 ring-red-300", selected && "ring-2 ring-primary", focused && "outline outline-2 outline-offset-2 outline-blue-500")}>
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={selected} onChange={onSelect} className="mt-1 h-4 w-4" aria-label={`Select ${candidate.fullName}`} />
        <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
          <p className="truncate text-sm font-semibold">{candidate.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{candidate.jobOpening?.title || "Open role"}</p>
        </button>
        {moving ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge className={cn("border", stageTone[candidate.stage])}>{stageLabel(candidate.stage)}</Badge>
        <Badge className={cn("border", priorityTone[candidate.priority || "LOW"])}>{candidate.priority || "LOW"}</Badge>
        <Badge>{candidate.totalExperience ?? 0}y</Badge>
        {candidate.isOverdue ? <Badge className="bg-red-100 text-red-700">Overdue</Badge> : candidate.needsReview ? <Badge className="bg-orange-100 text-orange-700">Needs review</Badge> : null}
      </div>
      <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{candidate.skills.slice(0, 4).join(", ") || "No skills listed"}</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{candidate.assignedRecruiter?.fullName || "Unassigned"}</span>
        <span>{displayDate(candidate.updatedAt)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={cn("text-xs", candidate.isOverdue ? "font-semibold text-red-600" : "text-muted-foreground")}>{candidate.nextAction || "Review candidate"}</span>
        <select className="h-7 rounded border bg-background px-1 text-xs" value={candidate.stage} onChange={(event) => onMove(event.target.value as CandidateStage)}>
          {stageOptions.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
        </select>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1">
        <Button size="sm" variant="ghost" className="h-7 px-1 text-xs" onClick={onQuickNote}><MessageSquarePlus className="h-3.5 w-3.5" /> Note</Button>
        <Button size="sm" variant="ghost" className="h-7 px-1 text-xs" onClick={onOpen}><CalendarClock className="h-3.5 w-3.5" /> Meet</Button>
        <Button size="sm" variant="ghost" className="h-7 px-1 text-xs text-red-600" onClick={onReject}><Archive className="h-3.5 w-3.5" /> Reject</Button>
      </div>
    </div>
  );
}

function CandidateTable({ candidates, selected, focusedId, onSelect, onOpen, onMove, page, totalPages, setPage }: { candidates: Candidate[]; selected: Set<string>; focusedId?: string; onSelect: (id: string) => void; onOpen: (candidate: Candidate) => void; onMove: (candidate: Candidate, stage: CandidateStage) => void; page: number; totalPages: number; setPage: (page: number) => void }) {
  return (
    <Card className="min-w-0 overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-3"></th>
              {["Candidate", "Job", "Stage", "Experience", "Skills", "Recruiter", "Last Updated", "Next Action", "Status"].map((header) => <th key={header} className="px-3 py-3 font-semibold">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.id} className={cn("border-t hover:bg-secondary/40", focusedId === candidate.id && "bg-blue-50")}>
                <td className="px-3 py-3"><input type="checkbox" checked={selected.has(candidate.id)} onChange={() => onSelect(candidate.id)} aria-label={`Select ${candidate.fullName}`} /></td>
                <td className="px-3 py-3"><button className="text-left font-medium hover:text-primary" onClick={() => onOpen(candidate)}>{candidate.fullName}<span className="block text-xs font-normal text-muted-foreground">{candidate.email}</span></button></td>
                <td className="px-3 py-3">{candidate.jobOpening?.title || "-"}</td>
                <td className="px-3 py-3"><Badge className={cn("border", stageTone[candidate.stage])}>{stageLabel(candidate.stage)}</Badge></td>
                <td className="px-3 py-3">{candidate.totalExperience ?? 0} years</td>
                <td className="px-3 py-3 max-w-56 truncate">{candidate.skills.join(", ")}</td>
                <td className="px-3 py-3">{candidate.assignedRecruiter?.fullName || "Unassigned"}</td>
                <td className="px-3 py-3">{displayDate(candidate.updatedAt)}</td>
                <td className={cn("px-3 py-3", candidate.isOverdue && "font-semibold text-red-600")}>
                  <span>{candidate.nextAction || "Review candidate"}</span>
                  <Badge className={cn("ml-2 border", priorityTone[candidate.priority || "LOW"])}>{candidate.priority || "LOW"}</Badge>
                </td>
                <td className="px-3 py-3">
                  <select className="h-8 rounded border bg-background px-2 text-xs" value={candidate.stage} onChange={(event) => onMove(candidate, event.target.value as CandidateStage)}>
                    {stageOptions.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!candidates.length ? <p className="p-8 text-center text-sm text-muted-foreground">No candidates match the selected filters.</p> : null}
      <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </Card>
  );
}

function FocusView({ candidate, onOpen, onMove }: { candidate: Candidate | null; onOpen: (candidate: Candidate) => void; onMove: (candidate: Candidate, stage: CandidateStage) => void }) {
  if (!candidate) return <Card className="p-8 text-center text-sm text-muted-foreground">No candidate selected. Adjust filters or open a candidate from the pipeline.</Card>;
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{candidate.fullName}</h2>
            <p className="text-sm text-muted-foreground">{candidate.email} {candidate.phone ? `· ${candidate.phone}` : ""}</p>
          </div>
          <Button onClick={() => onOpen(candidate)}><PanelRightOpen className="h-4 w-4" /> Open Drawer</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Role" value={candidate.jobOpening?.title || "Open role"} />
          <Metric label="Experience" value={`${candidate.totalExperience ?? 0} years`} />
          <Metric label="Recruiter" value={candidate.assignedRecruiter?.fullName || "Unassigned"} />
          <Metric label="Next action" value={candidate.nextAction || "Review candidate"} danger={candidate.isOverdue} />
        </div>
        <div>
          <p className="text-sm font-medium">Skills</p>
          <div className="mt-2 flex flex-wrap gap-2">{candidate.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div>
        </div>
      </Card>
      <Card className="space-y-3">
        <p className="font-semibold">Decision Controls</p>
        {stageOptions.map((stage) => <Button key={stage.value} variant={candidate.stage === stage.value ? "default" : "outline"} className="w-full justify-start" onClick={() => onMove(candidate, stage.value)}>{stage.label}</Button>)}
      </Card>
    </div>
  );
}

function CandidateDrawer({ candidate, loading, note, setNote, addNote, close, onMove }: { candidate: Candidate | null; loading: boolean; note: string; setNote: (note: string) => void; addNote: (event: FormEvent<HTMLFormElement>) => void; close: () => void; onMove: (candidate: Candidate, stage: CandidateStage) => void }) {
  if (!candidate) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={close}>
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{candidate.fullName}</h2>
            <p className="text-sm text-muted-foreground">{candidate.jobOpening?.title || "Open role"} · {candidate.email}</p>
          </div>
          <Button variant="ghost" onClick={close}>Close</Button>
        </div>
        {loading ? <Skeleton className="mt-4 h-40 w-full" /> : (
          <div className="mt-5 space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Stage" value={stageLabel(candidate.stage)} />
              <Metric label="Experience" value={`${candidate.totalExperience ?? 0} years`} />
              <Metric label="Source" value={stageLabel(candidate.source)} />
            </div>
            <div className="flex flex-wrap gap-2">{candidate.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div>
            <div className="grid gap-2 md:grid-cols-2">
              <Button variant="outline" disabled={!candidate.resumePath}><Download className="h-4 w-4" /> Resume</Button>
              <Button variant="outline"><CalendarClock className="h-4 w-4" /> Schedule Interview</Button>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Move Stage</p>
              <div className="grid gap-2 md:grid-cols-2">
                {stageOptions.map((stage) => <Button key={stage.value} size="sm" variant={candidate.stage === stage.value ? "default" : "outline"} onClick={() => onMove(candidate, stage.value)}>{stage.label}</Button>)}
              </div>
            </div>
            <form className="space-y-2" onSubmit={addNote}>
              <p className="text-sm font-semibold">Add note</p>
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add recruiter note or screening feedback" />
              <Button type="submit" size="sm">Save Note</Button>
            </form>
            <DrawerSection title="Recent Notes" empty="No notes yet.">
              {candidate.comments?.slice(0, 5).map((comment) => <TimelineRow key={comment.id} title={comment.comment} date={comment.createdAt} />)}
            </DrawerSection>
            <DrawerSection title="Activity Timeline" empty="No activity yet.">
              {candidate.activity?.slice(0, 8).map((item) => <TimelineRow key={item.id} title={item.action} date={item.createdAt} />)}
            </DrawerSection>
            <DrawerSection title="Interview History" empty="No interviews scheduled.">
              {candidate.interviews?.map((item) => <TimelineRow key={item.id} title={`${item.mode} interview`} date={item.scheduledAt} />)}
            </DrawerSection>
            <DrawerSection title="Documents" empty="No documents uploaded.">
              {candidate.documents?.map((doc) => <TimelineRow key={doc.id} title={doc.originalName || doc.fileName || "Document"} />)}
            </DrawerSection>
          </div>
        )}
      </aside>
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return <div className="rounded-lg border bg-slate-50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className={cn("mt-1 truncate text-sm font-semibold", danger && "text-red-600")}>{value}</p></div>;
}

function DrawerSection({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <div><p className="mb-2 text-sm font-semibold">{title}</p><div className="space-y-2">{hasChildren ? children : <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">{empty}</p>}</div></div>;
}

function TimelineRow({ title, date }: { title: string; date?: string }) {
  return <div className="rounded-md border bg-white p-3 text-sm"><p>{title}</p>{date ? <p className="mt-1 text-xs text-muted-foreground">{displayDate(date)}</p> : null}</div>;
}

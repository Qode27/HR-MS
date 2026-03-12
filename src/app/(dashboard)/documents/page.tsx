"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DocumentsPage() {
  const { data } = useApi<any[]>("/api/documents", []);
  const employees = useApi<any>("/api/employees?page=1&pageSize=200", []);
  const candidates = useApi<any[]>("/api/ats/candidates", []);
  const [form, setForm] = useState({ type: "OTHER", employeeId: "", candidateId: "", file: null as File | null });
  const [uploading, setUploading] = useState(false);

  async function upload() {
    if (!form.file) return toast.error("Select a file");
    const body = new FormData();
    body.set("type", form.type);
    if (form.employeeId) body.set("employeeId", form.employeeId);
    if (form.candidateId) body.set("candidateId", form.candidateId);
    body.set("file", form.file);
    setUploading(true);
    const res = await fetch("/api/documents", { method: "POST", body });
    const json = await res.json();
    setUploading(false);
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Upload failed");
    toast.success("Document uploaded");
    window.location.reload();
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Documents Center" subtitle="Version-aware employee and candidate documents" />
      <Card className="space-y-2">
        <p className="text-sm font-medium">Upload Document</p>
        <div className="grid gap-2 md:grid-cols-5">
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            <option value="OTHER">Other</option>
            <option value="ID_PROOF">ID Proof</option>
            <option value="ADDRESS_PROOF">Address Proof</option>
            <option value="EDUCATION">Education</option>
            <option value="BANK">Bank</option>
            <option value="OFFER_LETTER">Offer Letter</option>
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.employeeId} onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value, candidateId: e.target.value ? "" : p.candidateId }))}>
            <option value="">Employee (optional)</option>
            {(employees.data?.items || []).map((e: any) => <option key={e.id} value={e.id}>{e.employeeCode} - {e.firstName} {e.lastName}</option>)}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.candidateId} onChange={(e) => setForm((p) => ({ ...p, candidateId: e.target.value, employeeId: e.target.value ? "" : p.employeeId }))}>
            <option value="">Candidate (optional)</option>
            {(candidates.data || []).map((c: any) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
          <Input type="file" onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))} />
          <Button onClick={upload} disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button>
        </div>
      </Card>
      <DataTable rows={data || []} columns={[{ key: "type", label: "Type" }, { key: "fileName", label: "File" }, { key: "filePath", label: "Path" }, { key: "version", label: "Version" }]} />
    </section>
  );
}

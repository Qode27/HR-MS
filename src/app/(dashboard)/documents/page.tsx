"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type DocumentItem = {
  id: string;
  type: string;
  typeLabel: string;
  category: string;
  fileName: string;
  version: number;
  createdAt: string;
  scope: "company" | "employee" | "candidate";
  ownerLabel: string;
};

type DocumentResponse = {
  role: string;
  canManage: boolean;
  items: DocumentItem[];
};

const typeOptions = [
  ["OTHER", "Miscellaneous"],
  ["ID_PROOF", "Identity Proof"],
  ["ADDRESS_PROOF", "Address Proof"],
  ["EDUCATION", "Certificate / Education"],
  ["BANK", "Bank Document"],
  ["OFFER_LETTER", "Offer Letter"],
  ["APPOINTMENT_LETTER", "Appointment Letter"],
  ["PAYSLIP", "Payslip"]
] as const;

export default function DocumentsPage() {
  const { data, loading } = useApi<DocumentResponse>("/api/documents", []);
  const [employees, setEmployees] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [category, setCategory] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ type: "OTHER", employeeId: "", candidateId: "", file: null as File | null });

  const items = (data?.items || []).filter((item) => {
    const matchesQuery = `${item.fileName} ${item.ownerLabel} ${item.typeLabel}`.toLowerCase().includes(query.toLowerCase());
    const matchesScope = scope === "all" || item.scope === scope;
    const matchesCategory = category === "all" || item.category === category;
    return matchesQuery && matchesScope && matchesCategory;
  });

  useEffect(() => {
    if (!data?.canManage) return;
    void fetch("/api/employees?page=1&pageSize=200", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setEmployees(json.data?.items || []))
      .catch(() => setEmployees([]));
    void fetch("/api/ats/candidates", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setCandidates(json.data || []))
      .catch(() => setCandidates([]));
  }, [data?.canManage]);

  async function upload() {
    if (!form.file) return toast.error("Choose a file to upload");
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
      <PageHeader
        title="Document Center"
        subtitle={data?.canManage ? "Manage company, employee, and recruitment documents with clear ownership and access scope." : "Access only the documents shared with you and company-wide HR files."}
      />

      {data?.canManage ? (
        <Card className="space-y-3">
          <div>
            <p className="text-sm font-medium">Upload Document</p>
            <p className="text-xs text-muted-foreground">Attach a company-wide policy or assign a document directly to an employee or candidate.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-5">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
              {typeOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.employeeId} onChange={(e) => setForm((prev) => ({ ...prev, employeeId: e.target.value, candidateId: e.target.value ? "" : prev.candidateId }))}>
              <option value="">Company-wide or select employee</option>
              {employees.map((employee: any) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeCode} - {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.candidateId} onChange={(e) => setForm((prev) => ({ ...prev, candidateId: e.target.value, employeeId: e.target.value ? "" : prev.employeeId }))}>
              <option value="">Or select candidate</option>
              {candidates.map((candidate: any) => (
                <option key={candidate.id} value={candidate.id}>{candidate.fullName}</option>
              ))}
            </select>
            <Input type="file" onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} />
            <Button onClick={upload} disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search file, owner, or type" />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All scopes</option>
            <option value="company">Company</option>
            <option value="employee">Employee</option>
            <option value="candidate">Candidate</option>
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            <option value="identity">Identity</option>
            <option value="contract">Contract</option>
            <option value="payslip">Payslip</option>
            <option value="certificate">Certificate</option>
            <option value="miscellaneous">Miscellaneous</option>
          </select>
        </div>

        {loading ? (
          <div className="h-32 rounded-xl border bg-secondary/40" />
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No documents match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Document</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Scope</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                  <th className="px-3 py-2 font-medium">Uploaded</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b/60 align-top">
                    <td className="px-3 py-3">
                      <p className="font-medium">{item.fileName}</p>
                      <p className="text-xs text-muted-foreground">{item.typeLabel} • Version {item.version}</p>
                    </td>
                    <td className="px-3 py-3 capitalize">{item.category}</td>
                    <td className="px-3 py-3 capitalize">{item.scope}</td>
                    <td className="px-3 py-3">{item.ownerLabel}</td>
                    <td className="px-3 py-3">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <a href={`/api/documents/${item.id}/download`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}

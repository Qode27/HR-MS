"use client";

import { useEffect, useState } from "react";
import { Download, Eye, FileText, Trash2, Upload } from "lucide-react";
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
  mimeType?: string;
  fileSize?: number;
  createdAt: string;
  uploadedBy: string;
  scope: "company" | "employee" | "candidate";
  ownerLabel: string;
  canDelete: boolean;
  versions: Array<{
    id: string;
    version: number;
    fileName: string;
    mimeType: string;
    fileSize: number;
    uploadedBy: string;
    createdAt: string;
  }>;
};

type DocumentResponse = {
  role: string;
  canManage: boolean;
  canViewAll: boolean;
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [employees, setEmployees] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [category, setCategory] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: "OTHER", scope: "COMPANY", employeeId: "", file: null as File | null });
  const apiParams = new URLSearchParams();
  if (query.trim()) apiParams.set("q", query.trim());
  if (scope !== "all") apiParams.set("scope", scope.toUpperCase());
  if (employeeId !== "all") apiParams.set("employeeId", employeeId);
  if (from) apiParams.set("from", from);
  if (to) apiParams.set("to", to);
  apiParams.set("refresh", String(refreshKey));
  const apiUrl = `/api/documents?${apiParams.toString()}`;
  const { data, loading } = useApi<DocumentResponse>(apiUrl, [apiUrl]);

  const canUpload = Boolean(data?.canManage || data?.role === "EMPLOYEE");
  const items = (data?.items || []).filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    return matchesCategory;
  });

  useEffect(() => {
    if (!data?.canManage) return;
    void fetch("/api/employees?page=1&pageSize=200", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setEmployees(json.data?.items || []))
      .catch(() => setEmployees([]));
  }, [data?.canManage]);

  async function upload() {
    if (!form.file) return toast.error("Choose a PDF or image to upload");
    const body = new FormData();
    body.set("type", form.type);
    body.set("scope", data?.canManage ? form.scope : "EMPLOYEE");
    if (form.employeeId) body.set("employeeId", form.employeeId);
    body.set("file", form.file);

    setUploading(true);
    try {
      const res = await fetch("/api/documents", { method: "POST", body });
      const json = await res.json();
      if (!res.ok || json.success === false) return toast.error(json.error?.message || "Upload failed");
      toast.success("Document uploaded");
      setForm({ type: "OTHER", scope: "COMPANY", employeeId: "", file: null });
      setRefreshKey((key) => key + 1);
    } finally {
      setUploading(false);
    }
  }

  async function removeDocument(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.success === false) return toast.error(json.error?.message || "Delete failed");
      toast.success("Document deleted");
      setRefreshKey((key) => key + 1);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Document Center"
        subtitle={data?.canManage ? "Manage company-wide and employee-specific files with controlled access and version history." : "Access company-wide files and documents assigned to your employee profile."}
      />

      {canUpload ? (
        <Card className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Upload Document</p>
              <p className="text-xs text-muted-foreground">
                {data?.canManage ? "Tag the file as company-wide or assign it to a specific employee." : "Upload documents to your own employee file."}
              </p>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-5">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
              {typeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {data?.canManage ? (
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={form.scope}
                onChange={(event) => setForm((prev) => ({ ...prev, scope: event.target.value, employeeId: event.target.value === "COMPANY" ? "" : prev.employeeId }))}
              >
                <option value="COMPANY">Company-wide</option>
                <option value="EMPLOYEE">Employee-specific</option>
              </select>
            ) : null}
            {data?.canManage ? (
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={form.employeeId}
                disabled={form.scope !== "EMPLOYEE"}
                onChange={(event) => setForm((prev) => ({ ...prev, employeeId: event.target.value }))}
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employeeCode} - {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            ) : null}
            <Input className={data?.canManage ? "" : "md:col-span-3"} type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))} />
            <Button onClick={upload} disabled={uploading || (data?.canManage && form.scope === "EMPLOYEE" && !form.employeeId)}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <div className="grid gap-2 md:grid-cols-6">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search file, owner, or type" />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="all">All scopes</option>
            <option value="company">Company</option>
            <option value="employee">Employee</option>
          </select>
          {data?.canManage ? (
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="all">All employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeCode} - {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          ) : null}
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            <option value="identity">Identity</option>
            <option value="contract">Contract</option>
            <option value="payslip">Payslip</option>
            <option value="certificate">Certificate</option>
            <option value="miscellaneous">Miscellaneous</option>
          </select>
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-12 rounded-lg bg-secondary/60" />
            <div className="h-12 rounded-lg bg-secondary/40" />
            <div className="h-12 rounded-lg bg-secondary/30" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {data?.items.length ? "No documents match the current filters." : "No documents uploaded yet. Add company policies or employee documents to start building the document center."}
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
                  <th className="px-3 py-2 font-medium">Uploaded By</th>
                  <th className="px-3 py-2 font-medium">Uploaded</th>
                  <th className="px-3 py-2 font-medium">Versions</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b/60 align-top">
                    <td className="px-3 py-3">
                      <div className="flex items-start gap-2">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.typeLabel} - v{item.version} - {item.mimeType || "file"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 capitalize">{item.category}</td>
                    <td className="px-3 py-3 capitalize">{item.scope}</td>
                    <td className="px-3 py-3">{item.ownerLabel}</td>
                    <td className="px-3 py-3">{item.uploadedBy}</td>
                    <td className="px-3 py-3">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-xs"
                        defaultValue=""
                        onChange={(event) => {
                          if (event.target.value) window.open(event.target.value, "_blank", "noopener,noreferrer");
                          event.currentTarget.value = "";
                        }}
                      >
                        <option value="">History</option>
                        {item.versions.map((version) => (
                          [
                            <option key={`${version.id}-preview`} value={`/api/documents/${item.id}/download?versionId=${version.id}&preview=1`}>
                              Preview v{version.version} - {new Date(version.createdAt).toLocaleDateString()}
                            </option>,
                            <option key={`${version.id}-download`} value={`/api/documents/${item.id}/download?versionId=${version.id}`}>
                              Download v{version.version} - {version.uploadedBy}
                            </option>
                          ]
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <a className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition hover:bg-secondary" href={`/api/documents/${item.id}/download?preview=1`} target="_blank" rel="noreferrer" title="Preview document">
                          <Eye className="h-4 w-4" />
                        </a>
                        <a className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition hover:bg-secondary" href={`/api/documents/${item.id}/download`} title="Download document">
                          <Download className="h-4 w-4" />
                        </a>
                        {item.canDelete ? (
                          <Button size="sm" variant="ghost" title="Delete document" disabled={deletingId === item.id} onClick={() => removeDocument(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
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

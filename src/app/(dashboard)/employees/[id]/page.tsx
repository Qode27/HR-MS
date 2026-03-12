"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const tabs = ["Personal Info", "Job Info", "Attendance", "Leave", "Payroll", "Documents", "Performance", "Activity Logs"] as const;

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useApi<any>(`/api/employees/${id}`, [id]);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Personal Info");
  const [note, setNote] = useState({ title: "", description: "" });
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("OTHER");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function addNote() {
    const res = await fetch(`/api/employees/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note)
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed to add note");
    toast.success("Note added");
    setNote({ title: "", description: "" });
    window.location.reload();
  }

  async function uploadDocument(file?: File, type = "OTHER") {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("type", type);
    const res = await fetch(`/api/employees/${id}/documents`, { method: "POST", body: formData });
    const json = await res.json();
    setUploading(false);
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Upload failed");
    toast.success("Document uploaded");
    window.location.reload();
  }

  const summary = [
    { label: "Employee Code", value: data?.employeeCode },
    { label: "Department", value: data?.department?.name },
    { label: "Designation", value: data?.designation?.name },
    { label: "Manager", value: data?.manager ? `${data.manager.firstName} ${data.manager.lastName}` : "-" }
  ];

  return (
    <section className="space-y-4">
      <PageHeader title="Employee Profile" subtitle={data ? `${data.firstName} ${data.lastName}` : "Loading..."} />
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="space-y-2">
          {summary.map((item) => (
            <div key={item.label} className="rounded border p-2">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-medium">{item.value || "-"}</p>
            </div>
          ))}
        </Card>
        <Card className="lg:col-span-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <Button key={t} size="sm" variant={activeTab === t ? "default" : "outline"} onClick={() => setActiveTab(t)}>
                {t}
              </Button>
            ))}
          </div>
          {activeTab === "Personal Info" ? (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded border p-3 text-sm">Email: {data?.personalEmail || "-"}</div>
              <div className="rounded border p-3 text-sm">Phone: {data?.phone || "-"}</div>
              <div className="rounded border p-3 text-sm">DOB: {data?.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString() : "-"}</div>
              <div className="rounded border p-3 text-sm">Emergency: {data?.emergencyContact ? JSON.stringify(data.emergencyContact) : "-"}</div>
            </div>
          ) : null}
          {activeTab === "Job Info" ? (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded border p-3 text-sm">Joining Date: {data?.joiningDate ? new Date(data.joiningDate).toLocaleDateString() : "-"}</div>
              <div className="rounded border p-3 text-sm">Employment Type: {data?.employmentType || "-"}</div>
              <div className="rounded border p-3 text-sm">Status: {data?.status || "-"}</div>
              <div className="rounded border p-3 text-sm">Salary: {data?.salaryMonthly || "-"}</div>
            </div>
          ) : null}
          {activeTab === "Attendance" ? (
            <div className="space-y-2">
              {(data?.attendanceRecords || []).map((r: any) => (
                <div key={r.id} className="rounded border p-2 text-sm">
                  {new Date(r.date).toLocaleDateString()} - {r.status} ({r.workMinutes} mins)
                </div>
              ))}
            </div>
          ) : null}
          {activeTab === "Leave" ? (
            <div className="space-y-2">
              {(data?.leaveRequests || []).map((r: any) => (
                <div key={r.id} className="rounded border p-2 text-sm">
                  {r.leaveType?.name} - {r.status} ({new Date(r.startDate).toLocaleDateString()} to {new Date(r.endDate).toLocaleDateString()})
                </div>
              ))}
            </div>
          ) : null}
          {activeTab === "Payroll" ? (
            <div className="space-y-2">
              {(data?.payslips || []).map((r: any) => (
                <div key={r.id} className="rounded border p-2 text-sm">
                  {r.month}/{r.year} - {r.pdfPath || "No PDF"}
                </div>
              ))}
            </div>
          ) : null}
          {activeTab === "Documents" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)}>
                  <option value="OTHER">Other</option>
                  <option value="ID_PROOF">ID Proof</option>
                  <option value="ADDRESS_PROOF">Address Proof</option>
                  <option value="EDUCATION">Education</option>
                  <option value="BANK">Bank</option>
                </select>
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <Button disabled={uploading || !selectedFile} variant="outline" onClick={() => uploadDocument(selectedFile || undefined, selectedDocType)}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
              {(data?.documents || []).map((doc: any) => (
                <div key={doc.id} className="rounded border p-2 text-sm">{doc.type} - {doc.fileName} (v{doc.version})</div>
              ))}
            </div>
          ) : null}
          {activeTab === "Performance" ? (
            <div className="space-y-2">
              {(data?.performanceReviews || []).map((p: any) => (
                <div key={p.id} className="rounded border p-2 text-sm">Cycle {p.cycleId}: Self {p.selfRating || "-"} / Manager {p.managerRating || "-"}</div>
              ))}
            </div>
          ) : null}
          {activeTab === "Activity Logs" ? (
            <div className="space-y-2">
              {(data?.timelineEvents || []).map((x: any) => <p key={x.id} className="rounded border p-2 text-sm">{x.title}{x.description ? ` - ${x.description}` : ""}</p>)}
              <div className="space-y-2 rounded border p-3">
                <Input placeholder="Note title" value={note.title} onChange={(e) => setNote((p) => ({ ...p, title: e.target.value }))} />
                <Textarea placeholder="Description" value={note.description} onChange={(e) => setNote((p) => ({ ...p, description: e.target.value }))} />
                <Button size="sm" onClick={addNote}>Add Note</Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { data } = useApi<any>("/api/settings/bootstrap", []);
  const [department, setDepartment] = useState({ name: "", code: "" });
  const [designationName, setDesignationName] = useState("");

  async function addDepartment() {
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(department)
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success("Department created");
    setDepartment({ name: "", code: "" });
    window.location.reload();
  }

  async function addDesignation() {
    const res = await fetch("/api/designations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: designationName })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success("Designation created");
    setDesignationName("");
    window.location.reload();
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Settings" subtitle="Admin configuration: departments, leave, shifts, templates" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <p className="text-sm font-medium">Departments</p>
          <div className="flex gap-2">
            <Input placeholder="Name" value={department.name} onChange={(e) => setDepartment((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Code" value={department.code} onChange={(e) => setDepartment((p) => ({ ...p, code: e.target.value }))} />
            <Button onClick={addDepartment}>Add</Button>
          </div>
          <div className="space-y-1">
            {(data?.departments || []).map((d: any) => <div key={d.id} className="rounded border p-2 text-sm">{d.name} ({d.code})</div>)}
          </div>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-medium">Designations</p>
          <div className="flex gap-2">
            <Input placeholder="Designation name" value={designationName} onChange={(e) => setDesignationName(e.target.value)} />
            <Button onClick={addDesignation}>Add</Button>
          </div>
          <div className="space-y-1">
            {(data?.designations || []).map((d: any) => <div key={d.id} className="rounded border p-2 text-sm">{d.name}</div>)}
          </div>
        </Card>
      </div>
    </section>
  );
}

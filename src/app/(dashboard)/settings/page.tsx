"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { hasPermission } from "@/lib/rbac";

type MeResponse = { role: string };

export default function SettingsPage() {
  const { data, loading } = useApi<any>("/api/settings/bootstrap", []);
  const { data: me } = useApi<MeResponse>("/api/auth/me", []);
  const { data: tenants } = useApi<any[]>("/api/tenants", []);
  const canManageTenants = hasPermission(me?.role || "EMPLOYEE", "tenant:manage");
  const [department, setDepartment] = useState({ name: "", code: "" });
  const [designationName, setDesignationName] = useState("");
  const [client, setClient] = useState({ name: "", ownerName: "", ownerEmail: "", contactPhone: "", password: "Welcome@123" });

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

  async function addClient() {
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(client)
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed to onboard client");
    toast.success("Client onboarded with Super Admin access");
    setClient({ name: "", ownerName: "", ownerEmail: "", contactPhone: "", password: "Welcome@123" });
    window.location.reload();
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Settings" subtitle="Platform onboarding, company structure, roles, and operating policies." />

      {canManageTenants ? (
        <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
          <Card className="space-y-3">
            <div>
              <p className="text-sm font-medium">Onboard client</p>
              <p className="text-xs text-muted-foreground">Creates an isolated tenant, active subscription, and client Super Admin.</p>
            </div>
            <Input placeholder="Client company name" value={client.name} onChange={(e) => setClient((value) => ({ ...value, name: e.target.value }))} />
            <Input placeholder="Super Admin name" value={client.ownerName} onChange={(e) => setClient((value) => ({ ...value, ownerName: e.target.value }))} />
            <Input placeholder="Super Admin email" value={client.ownerEmail} onChange={(e) => setClient((value) => ({ ...value, ownerEmail: e.target.value }))} />
            <Input placeholder="Contact phone" value={client.contactPhone} onChange={(e) => setClient((value) => ({ ...value, contactPhone: e.target.value }))} />
            <Input placeholder="Temporary password" value={client.password} onChange={(e) => setClient((value) => ({ ...value, password: e.target.value }))} />
            <Button onClick={addClient} className="w-full">Create client</Button>
          </Card>
          <Card className="space-y-3">
            <p className="text-sm font-medium">Clients</p>
            <div className="grid gap-2">
              {(tenants || []).map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                  </div>
                  <Badge>{tenant.subscriptions?.[0]?.status || tenant.status}</Badge>
                </div>
              ))}
              {!tenants?.length ? <p className="text-sm text-muted-foreground">No clients found.</p> : null}
            </div>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <p className="text-sm font-medium">Departments</p>
          <div className="flex gap-2">
            <Input placeholder="Name" value={department.name} onChange={(e) => setDepartment((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Code" value={department.code} onChange={(e) => setDepartment((p) => ({ ...p, code: e.target.value }))} />
            <Button onClick={addDepartment}>Add</Button>
          </div>
          <div className="space-y-1">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
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

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, CreditCard, Eye, Pencil, Plus, Search, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

type Client = {
  id: string;
  tenantId: string;
  companyName: string;
  slug: string;
  domain?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  subscriptionPlan: string;
  status: "ACTIVE" | "TRIAL" | "SUSPENDED" | "INACTIVE" | string;
  createdAt: string;
  updatedAt: string;
  employeeLimit?: number | null;
  mrr?: number | string | null;
  monthlyPrice?: number | string | null;
  initialSuperAdmin?: {
    email: string;
    temporaryPassword?: string | null;
  };
};

type ClientForm = {
  companyName: string;
  slug: string;
  domain: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  subscriptionPlan: string;
  employeeLimit: string;
  monthlyPrice: string;
  status: string;
};

const initialForm: ClientForm = {
  companyName: "",
  slug: "",
  domain: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  subscriptionPlan: "Enterprise",
  employeeLimit: "250",
  monthlyPrice: "49999",
  status: "TRIAL"
};

const planOptions = ["Starter", "Growth", "Enterprise", "Enterprise Plus"];
const statusOptions = ["TRIAL", "ACTIVE", "SUSPENDED", "INACTIVE"];

function toMoney(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (status === "TRIAL") return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
  if (status === "SUSPENDED") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  if (status === "INACTIVE") return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200";
  return "bg-secondary text-secondary-foreground";
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; temporaryPassword: string } | null>(null);

  async function loadClients() {
    setLoading(true);
    setError(null);
    try {
      const rows = await api<Client[]>("/api/clients");
      setClients(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) =>
      [client.companyName, client.slug, client.domain || "", client.contactName, client.contactEmail, client.subscriptionPlan].some((value) =>
        value.toLowerCase().includes(term)
      )
    );
  }, [clients, query]);

  const metrics = useMemo(() => {
    const activeClients = clients.filter((client) => client.status === "ACTIVE").length;
    const totalMrr = clients.reduce((sum, client) => sum + Number(client.mrr || 0), 0);
    const employeeCapacity = clients.reduce((sum, client) => sum + Number(client.employeeLimit || 0), 0);
    return { totalClients: clients.length, activeClients, totalMrr, employeeCapacity };
  }, [clients]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const client = await api<Client>(editingClient ? `/api/clients/${editingClient.id}` : "/api/clients", {
        method: editingClient ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          employeeLimit: Number(form.employeeLimit),
          monthlyPrice: Number(form.monthlyPrice)
        })
      });
      if (!editingClient && client.initialSuperAdmin?.temporaryPassword) {
        setCreatedCredentials({
          email: client.initialSuperAdmin.email,
          temporaryPassword: client.initialSuperAdmin.temporaryPassword
        });
      }
      setClients((current) => editingClient ? current.map((item) => (item.id === client.id ? client : item)) : [client, ...current.filter((item) => item.id !== client.id)]);
      setForm(initialForm);
      setEditingClient(null);
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to create client");
    } finally {
      setSubmitting(false);
    }
  }

  function openCreateModal() {
    setEditingClient(null);
    setForm(initialForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(client: Client) {
    setEditingClient(client);
    setForm({
      companyName: client.companyName,
      slug: client.slug,
      domain: client.domain || "",
      contactName: client.contactName,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone,
      subscriptionPlan: client.subscriptionPlan || "Enterprise",
      employeeLimit: String(client.employeeLimit || 250),
      monthlyPrice: String(client.monthlyPrice || client.mrr || 0),
      status: client.status || "ACTIVE"
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function updateStatus(client: Client, status: string) {
    const updated = await api<Client>(`/api/clients/${client.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    setClients((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function softDelete(client: Client) {
    if (!window.confirm(`Soft delete ${client.companyName}? Client data will be retained.`)) return;
    await api(`/api/clients/${client.id}`, { method: "DELETE" });
    setClients((current) => current.filter((item) => item.id !== client.id));
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Clients"
        subtitle="Create and manage isolated SaaS tenant accounts for client onboarding."
        actions={
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Clients</p>
            <Building2 className="h-4 w-4 text-cyan-600" />
          </div>
          {loading ? <Skeleton className="mt-3 h-8 w-20" /> : <p className="mt-3 text-2xl font-semibold">{metrics.totalClients}</p>}
        </Card>
        <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Active Clients</p>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          {loading ? <Skeleton className="mt-3 h-8 w-20" /> : <p className="mt-3 text-2xl font-semibold">{metrics.activeClients}</p>}
        </Card>
        <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Employee Capacity</p>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          {loading ? <Skeleton className="mt-3 h-8 w-20" /> : <p className="mt-3 text-2xl font-semibold">{metrics.employeeCapacity}</p>}
        </Card>
        <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Monthly Revenue</p>
            <CreditCard className="h-4 w-4 text-violet-600" />
          </div>
          {loading ? <Skeleton className="mt-3 h-8 w-28" /> : <p className="mt-3 text-2xl font-semibold">{toMoney(metrics.totalMrr)}</p>}
        </Card>
      </div>

      {createdCredentials ? (
        <Card className="border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Client onboarded. Initial SUPER_ADMIN credentials are ready.</p>
              <p className="mt-1 text-sm">Email: {createdCredentials.email}</p>
              <p className="text-sm">Temporary password: {createdCredentials.temporaryPassword}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCreatedCredentials(null)}>
              Dismiss
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Client Directory</h2>
            <p className="text-sm text-muted-foreground">Every row maps to an isolated tenant record.</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search clients" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">{clients.length === 0 ? "No clients yet. Start by adding your first client." : "No clients match your search."}</p>
            <p className="mt-1 text-sm text-muted-foreground">New clients receive a tenant ID, subscription, and Super Admin owner.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-12 border-b bg-secondary/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
                <span className="col-span-2">Company</span>
                <span className="col-span-2">Contact</span>
                <span className="col-span-1">Status</span>
                <span className="col-span-1">Plan</span>
                <span className="col-span-1 text-right">Limit</span>
                <span className="col-span-1 text-right">MRR</span>
                <span className="col-span-2 text-right">Created</span>
                <span className="col-span-2 text-right">Actions</span>
              </div>
              {filteredClients.map((client) => (
                <div key={client.id} className="grid grid-cols-12 items-center gap-2 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-secondary/40">
                  <div className="col-span-2 min-w-0">
                    <p className="truncate font-medium">{client.companyName}</p>
                    <p className="truncate text-xs text-muted-foreground">{client.domain || client.slug}</p>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <p className="truncate font-medium">{client.contactName || "Not assigned"}</p>
                    <p className="truncate text-xs text-muted-foreground">{client.contactEmail || client.contactPhone}</p>
                  </div>
                  <div className="col-span-1">
                    <Badge className={statusClass(client.status)}>{client.status}</Badge>
                  </div>
                  <span className="col-span-1 truncate">{client.subscriptionPlan || "Unassigned"}</span>
                  <span className="col-span-1 text-right">{client.employeeLimit || 0}</span>
                  <span className="col-span-1 text-right font-medium">{toMoney(client.mrr)}</span>
                  <span className="col-span-2 text-right text-muted-foreground">{formatDate(client.createdAt)}</span>
                  <div className="col-span-2 flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewClient(client)} title="View client"><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditModal(client)} title="Edit client"><Pencil className="h-4 w-4" /></Button>
                    {client.status === "ACTIVE" ? (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(client, "SUSPENDED")}>Suspend</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(client, "ACTIVE")}>Activate</Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => softDelete(client)} title="Soft delete client"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-2xl rounded-xl border bg-card shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">{editingClient ? "Edit Client" : "Add Client"}</h2>
                <p className="text-sm text-muted-foreground">{editingClient ? "Update client contact, plan, limits, pricing, and status." : "Create a new tenant with an owner contact and subscription plan."}</p>
              </div>
              <button className="rounded-md p-2 text-muted-foreground transition hover:bg-secondary" onClick={() => { setModalOpen(false); setEditingClient(null); }} aria-label="Close add client modal">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
              {formError ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div> : null}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium">
                  Company Name
                  <Input required value={form.companyName} onChange={(event) => setForm((value) => ({ ...value, companyName: event.target.value, slug: value.slug ? value.slug : slugify(event.target.value) }))} placeholder="Acme Technologies" />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Slug
                  <Input required value={form.slug} onChange={(event) => setForm((value) => ({ ...value, slug: slugify(event.target.value) }))} placeholder="acme-technologies" />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Domain
                  <Input value={form.domain} onChange={(event) => setForm((value) => ({ ...value, domain: event.target.value }))} placeholder="acme.com" />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Contact Name
                  <Input required value={form.contactName} onChange={(event) => setForm((value) => ({ ...value, contactName: event.target.value }))} placeholder="Priya Sharma" />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Email
                  <Input required type="email" value={form.contactEmail} onChange={(event) => setForm((value) => ({ ...value, contactEmail: event.target.value }))} placeholder="priya@acme.com" />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Phone
                  <Input required value={form.contactPhone} onChange={(event) => setForm((value) => ({ ...value, contactPhone: event.target.value }))} placeholder="+91 98765 43210" />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Plan
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                    value={form.subscriptionPlan}
                    onChange={(event) => setForm((value) => ({ ...value, subscriptionPlan: event.target.value }))}
                  >
                    {planOptions.map((plan) => (
                      <option key={plan} value={plan}>
                        {plan}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Employee Limit
                  <Input required type="number" min={1} value={form.employeeLimit} onChange={(event) => setForm((value) => ({ ...value, employeeLimit: event.target.value }))} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Monthly Price
                  <Input required type="number" min={0} value={form.monthlyPrice} onChange={(event) => setForm((value) => ({ ...value, monthlyPrice: event.target.value }))} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Status
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring" value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}>
                    {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditingClient(null); }} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : editingClient ? "Save Changes" : "Create Client"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {viewClient ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-lg rounded-xl border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{viewClient.companyName}</h2>
                <p className="text-sm text-muted-foreground">{viewClient.slug}</p>
              </div>
              <button className="rounded-md p-2 text-muted-foreground transition hover:bg-secondary" onClick={() => setViewClient(null)} aria-label="Close client details">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Contact</span><span className="font-medium">{viewClient.contactName}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Email</span><span className="font-medium">{viewClient.contactEmail}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Phone</span><span className="font-medium">{viewClient.contactPhone}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Plan</span><span className="font-medium">{viewClient.subscriptionPlan}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Employee Limit</span><span className="font-medium">{viewClient.employeeLimit}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Monthly Price</span><span className="font-medium">{toMoney(viewClient.monthlyPrice || viewClient.mrr)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Created</span><span className="font-medium">{formatDate(viewClient.createdAt)}</span></div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

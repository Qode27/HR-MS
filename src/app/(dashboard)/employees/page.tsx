"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";

type EmployeeRow = { id: string; employeeCode: string; firstName: string; lastName: string; status: string };

type EmployeeListResponse = {
  items: EmployeeRow[];
  page: number;
  pageSize: number;
  total: number;
};

export default function EmployeesPage() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [meta, setMeta] = useState<{ page: number; pageSize: number; total: number }>({ page: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({ departmentId: "", designationId: "", managerId: "", status: "" });
  const [bootstrap, setBootstrap] = useState<{
    departments: Array<{ id: string; name: string }>;
    designations: Array<{ id: string; name: string }>;
    managers: Array<{ id: string; firstName: string; lastName: string; employeeCode: string }>;
  } | null>(null);

  async function load(page = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10",
        q,
        departmentId: filters.departmentId,
        designationId: filters.designationId,
        managerId: filters.managerId,
        status: filters.status
      });
      const json = await api<EmployeeListResponse>(`/api/employees?${params.toString()}`);
      setRows(json.items || []);
      setMeta({ page: json.page, pageSize: json.pageSize, total: json.total });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(1);
  }, []);

  useEffect(() => {
    api<{
      departments: Array<{ id: string; name: string }>;
      designations: Array<{ id: string; name: string }>;
      managers: Array<{ id: string; firstName: string; lastName: string; employeeCode: string }>;
    }>("/api/employees/bootstrap")
      .then(setBootstrap)
      .catch((e) => toast.error(e.message));
  }, []);

  const tableRows = rows.map((x) => ({ ...x, name: `${x.firstName} ${x.lastName}` }));
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  return (
    <section className="space-y-4">
      <PageHeader title="Employee Directory" subtitle="Search, filter and manage workforce" actions={<Link href="/employees/new"><Button>Add Employee</Button></Link>} />
      <div className="grid gap-2 rounded-xl border bg-card/70 p-3 md:grid-cols-5">
        <Input placeholder="Search name or code" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filters.departmentId} onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}>
          <option value="">All departments</option>
          {(bootstrap?.departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filters.designationId} onChange={(e) => setFilters({ ...filters, designationId: e.target.value })}>
          <option value="">All designations</option>
          {(bootstrap?.designations || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filters.managerId} onChange={(e) => setFilters({ ...filters, managerId: e.target.value })}>
          <option value="">All managers</option>
          {(bootstrap?.managers || []).map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
        </select>
        <div className="flex gap-2">
          <select className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="LOCKED">Locked</option>
          </select>
          <Button variant="outline" onClick={() => load(1)}>Apply</Button>
        </div>
      </div>
      {loading ? <div className="h-48 rounded-xl border shimmer animate-shimmer" /> : <DataTable rows={tableRows as unknown as Record<string, unknown>[]} columns={[{ key: "employeeCode", label: "Code" }, { key: "name", label: "Name" }, { key: "status", label: "Status" }]} />}
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>Previous</Button>
        <span className="text-xs text-muted-foreground">Page {meta.page} of {totalPages}</span>
        <Button size="sm" variant="outline" disabled={meta.page >= totalPages} onClick={() => load(meta.page + 1)}>Next</Button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map((r) => (
          <Link key={r.id} href={`/employees/${r.id}`} className="cursor-pointer rounded-md border bg-card/60 p-2 text-sm hover:bg-secondary">
            Open {r.firstName} {r.lastName} ({r.employeeCode})
          </Link>
        ))}
      </div>
    </section>
  );
}

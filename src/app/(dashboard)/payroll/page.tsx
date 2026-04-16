"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";

type PayrollRun = {
  id: string;
  month: number;
  year: number;
  status: string;
  _count?: { items: number };
  summaryJson?: { totals?: { net?: number } };
};

type Payslip = {
  id: string;
  month: number;
  year: number;
  pdfPath?: string | null;
  payrollItem: { grossPay: number; deductions: number; netPay: number };
};

type PayrollOverview = {
  role: string;
  canManage: boolean;
  totals: { runs: number; draft: number; completed: number; net: number; employees: number };
  runs?: PayrollRun[];
  payslips?: Payslip[];
};

export default function PayrollPage() {
  const { data } = useApi<PayrollOverview>("/api/payroll/overview", []);
  const [period, setPeriod] = useState(() => {
    const today = new Date();
    return { month: String(today.getMonth() + 1), year: String(today.getFullYear()) };
  });

  async function runPayroll() {
    const res = await fetch("/api/payroll/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: Number(period.month), year: Number(period.year) })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed to prepare payroll run");
    toast.success("Payroll run prepared as draft");
    window.location.reload();
  }

  async function finalizeRun(id: string) {
    const res = await fetch(`/api/payroll/runs/${id}/finalize`, { method: "POST" });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed to finalize payroll");
    toast.success("Payroll finalized");
    window.location.reload();
  }

  if (!data) {
    return <section className="space-y-4"><PageHeader title="Payroll" subtitle="Loading payroll workspace..." /><div className="h-40 rounded-xl border bg-secondary/40" /></section>;
  }

  if (!data.canManage) {
    const payslipRows = (data.payslips || []).map((slip) => ({
      month: slip.month,
      year: slip.year,
      gross: Number(slip.payrollItem.grossPay),
      deductions: Number(slip.payrollItem.deductions),
      net: Number(slip.payrollItem.netPay)
    }));

    return (
      <section className="space-y-4">
        <PageHeader title="My Payroll" subtitle="View completed payslips and personal payroll history." actions={<Link href="/payroll/payslips"><Button>Open Payslips</Button></Link>} />
        <div className="grid gap-4 md:grid-cols-3">
          <Card><p className="text-xs text-muted-foreground">Completed Payslips</p><p className="text-2xl font-semibold">{data.totals.completed}</p></Card>
          <Card><p className="text-xs text-muted-foreground">Net Paid</p><p className="text-2xl font-semibold">{Math.round(data.totals.net)}</p></Card>
          <Card><p className="text-xs text-muted-foreground">Access Scope</p><p className="text-2xl font-semibold">Self only</p></Card>
        </div>
        <DataTable rows={payslipRows} columns={[{ key: "month", label: "Month" }, { key: "year", label: "Year" }, { key: "gross", label: "Gross" }, { key: "deductions", label: "Deductions" }, { key: "net", label: "Net Pay" }]} />
      </section>
    );
  }

  const runRows = (data.runs || []).map((run) => ({
    id: run.id,
    period: `${String(run.month).padStart(2, "0")}/${run.year}`,
    status: run.status,
    employees: run._count?.items || 0,
    net: Math.round(Number(run.summaryJson?.totals?.net || 0))
  }));

  return (
    <section className="space-y-4">
      <PageHeader
        title="Payroll Operations"
        subtitle="Prepare monthly payroll, review totals, and finalize only when ready."
        actions={
          <div className="flex flex-wrap gap-2">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={period.month} onChange={(e) => setPeriod((prev) => ({ ...prev, month: e.target.value }))}>
              {Array.from({ length: 12 }).map((_, index) => (
                <option key={index + 1} value={index + 1}>{String(index + 1).padStart(2, "0")}</option>
              ))}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={period.year} onChange={(e) => setPeriod((prev) => ({ ...prev, year: e.target.value }))}>
              {[2025, 2026, 2027].map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <Button onClick={runPayroll}>Prepare Payroll</Button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-xs text-muted-foreground">Active Employees</p><p className="text-2xl font-semibold">{data.totals.employees}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Payroll Runs</p><p className="text-2xl font-semibold">{data.totals.runs}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Draft Runs</p><p className="text-2xl font-semibold">{data.totals.draft}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Completed Runs</p><p className="text-2xl font-semibold">{data.totals.completed}</p></Card>
      </div>
      <DataTable rows={runRows} columns={[{ key: "period", label: "Period" }, { key: "status", label: "Status" }, { key: "employees", label: "Employees" }, { key: "net", label: "Net Pay" }]} />
      <Card className="space-y-2">
        <p className="text-sm font-medium">Finalize Drafts</p>
        {(data.runs || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No payroll runs prepared yet.</p>
        ) : (
          (data.runs || []).map((run) => (
            <div key={run.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span>{String(run.month).padStart(2, "0")}/{run.year} • {run.status}</span>
              <Button size="sm" variant={run.status === "COMPLETED" ? "outline" : "default"} disabled={run.status === "COMPLETED"} onClick={() => finalizeRun(run.id)}>
                {run.status === "COMPLETED" ? "Finalized" : "Finalize"}
              </Button>
            </div>
          ))
        )}
      </Card>
    </section>
  );
}

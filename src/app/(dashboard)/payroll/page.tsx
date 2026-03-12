"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Card } from "@/components/ui/card";

export default function PayrollPage() {
  const { data } = useApi<any[]>("/api/payroll/runs", []);

  async function runPayroll() {
    const d = new Date();
    const res = await fetch("/api/payroll/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: d.getMonth() + 1, year: d.getFullYear() })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success("Payroll run processed");
    window.location.reload();
  }

  async function finalizeRun(id: string) {
    const res = await fetch(`/api/payroll/runs/${id}/finalize`, { method: "POST" });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success("Payroll finalized");
    window.location.reload();
  }

  const totals = (data || []).reduce(
    (acc, r) => {
      acc.runs += 1;
      acc.items += r._count?.items || 0;
      const net = Number(r.summaryJson?.totals?.net || 0);
      acc.net += net;
      return acc;
    },
    { runs: 0, items: 0, net: 0 }
  );

  return (
    <section className="space-y-4">
      <PageHeader title="Payroll Dashboard" subtitle="Run and monitor monthly payroll" actions={<div className="flex gap-2"><Button onClick={runPayroll}>Run Payroll</Button><Link href="/payroll/payslips"><Button variant="outline">Payslips</Button></Link></div>} />
      <div className="grid gap-3 md:grid-cols-3">
        <Card><p className="text-xs text-muted-foreground">Total Runs</p><p className="text-2xl font-semibold">{totals.runs}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Payroll Items</p><p className="text-2xl font-semibold">{totals.items}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Net Paid</p><p className="text-2xl font-semibold">{Math.round(totals.net)}</p></Card>
      </div>
      <DataTable rows={(data || []).map((r) => ({ ...r, items: r._count?.items || 0, net: Math.round(Number(r.summaryJson?.totals?.net || 0)) }))} columns={[{ key: "month", label: "Month" }, { key: "year", label: "Year" }, { key: "status", label: "Status" }, { key: "items", label: "Employees" }, { key: "net", label: "Net Paid" }]} />
      <Card>
        <p className="mb-2 text-sm font-medium">Finalize Runs</p>
        {(data || []).map((r) => (
          <div key={r.id} className="mb-2 flex items-center justify-between rounded border p-2 text-sm">
            <span>{r.month}/{r.year} - {r.status}</span>
            <Button size="sm" variant="outline" disabled={r.status === "COMPLETED"} onClick={() => finalizeRun(r.id)}>Finalize</Button>
          </div>
        ))}
      </Card>
    </section>
  );
}

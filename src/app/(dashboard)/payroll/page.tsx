"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Lock, Play } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PayrollItem = {
  id: string;
  employeeId: string;
  calculationType: string;
  baseSalary: number | string;
  hourlyRate?: number | string | null;
  perHourRate?: number | string | null;
  approvedHours: number | string;
  allowances: number | string;
  deductions: number | string;
  grossPay: number | string;
  netPay: number | string;
  employee?: { employeeCode: string; firstName: string; lastName: string };
  payslip?: { id: string; pdfPath?: string | null } | null;
};

type PayrollRun = {
  id: string;
  month: number;
  year: number;
  status: string;
  _count?: { items: number };
  summaryJson?: { totals?: { gross?: number; net?: number; approvedHours?: number; allowances?: number; deductions?: number } };
  items?: PayrollItem[];
};

type Payslip = {
  id: string;
  month: number;
  year: number;
  payrollItem: PayrollItem;
};

type PayrollOverview = {
  role: string;
  canManage: boolean;
  totals: { runs: number; locked: number; processing: number; net: number; gross: number; approvedHours: number; employees: number };
  runs?: PayrollRun[];
  payslips?: Payslip[];
};

function money(value: unknown) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function period(run: PayrollRun | Payslip) {
  return `${String(run.month).padStart(2, "0")}/${run.year}`;
}

export default function PayrollPage() {
  const { data, loading, error } = useApi<PayrollOverview>("/api/payroll", []);
  const [periodValue, setPeriodValue] = useState(() => {
    const today = new Date();
    return { month: String(today.getMonth() + 1), year: String(today.getFullYear()) };
  });
  const [running, setRunning] = useState(false);

  async function runPayroll() {
    setRunning(true);
    const res = await fetch("/api/payroll/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: Number(periodValue.month), year: Number(periodValue.year) })
    });
    const json = await res.json();
    setRunning(false);
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed to run payroll");
    toast.success("Payroll generated, payslips created, and period locked");
    window.location.reload();
  }

  if (loading && !data) {
    return (
      <section className="space-y-4">
        <PageHeader title="Payroll" subtitle="Computing payroll from approved timesheets." />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  if (error) return <section className="space-y-4"><PageHeader title="Payroll" subtitle="Unable to load payroll." /><Card className="text-sm text-destructive">{error}</Card></section>;
  if (!data) return null;

  if (!data.canManage) {
    return (
      <section className="space-y-4">
        <PageHeader title="My Payroll" subtitle="Completed payslips generated from approved timesheet payroll." />
        <div className="grid gap-4 md:grid-cols-3">
          <Card><p className="text-xs text-muted-foreground">Payslips</p><p className="mt-2 text-2xl font-semibold">{data.totals.locked}</p></Card>
          <Card><p className="text-xs text-muted-foreground">Gross Pay</p><p className="mt-2 text-2xl font-semibold">{money(data.totals.gross)}</p></Card>
          <Card><p className="text-xs text-muted-foreground">Net Paid</p><p className="mt-2 text-2xl font-semibold">{money(data.totals.net)}</p></Card>
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-2">Period</th><th className="px-3 py-2">Gross</th><th className="px-3 py-2">Deductions</th><th className="px-3 py-2">Net</th><th className="px-3 py-2">Payslip</th></tr></thead>
            <tbody>
              {(data.payslips || []).map((slip) => (
                <tr key={slip.id} className="border-b/50">
                  <td className="px-3 py-2">{period(slip)}</td>
                  <td className="px-3 py-2">{money(slip.payrollItem.grossPay)}</td>
                  <td className="px-3 py-2">{money(slip.payrollItem.deductions)}</td>
                  <td className="px-3 py-2 font-medium">{money(slip.payrollItem.netPay)}</td>
                  <td className="px-3 py-2"><Link href={`/api/payslip/${slip.payrollItem.id}`} target="_blank" className="inline-flex items-center gap-2 text-primary"><Download className="h-4 w-4" /> Download</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.payslips?.length ? <p className="p-6 text-center text-sm text-muted-foreground">No completed payslips yet.</p> : null}
        </Card>
      </section>
    );
  }

  const latest = data.runs?.[0];

  return (
    <section className="space-y-4">
      <PageHeader
        title="Payroll Operations"
        subtitle="Monthly payroll is computed from approved timesheets and employee salary structures."
        actions={
          <div className="flex flex-wrap gap-2">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={periodValue.month} onChange={(event) => setPeriodValue((prev) => ({ ...prev, month: event.target.value }))}>
              {Array.from({ length: 12 }).map((_, index) => <option key={index + 1} value={index + 1}>{String(index + 1).padStart(2, "0")}</option>)}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={periodValue.year} onChange={(event) => setPeriodValue((prev) => ({ ...prev, year: event.target.value }))}>
              {[2025, 2026, 2027].map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <Button onClick={runPayroll} disabled={running}><Play className="h-4 w-4" /> {running ? "Running..." : "Run Payroll"}</Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-5">
        <Card><p className="text-xs text-muted-foreground">Active Employees</p><p className="mt-2 text-2xl font-semibold">{data.totals.employees}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Locked Runs</p><p className="mt-2 text-2xl font-semibold">{data.totals.locked}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Approved Hours</p><p className="mt-2 text-2xl font-semibold">{Math.round(data.totals.approvedHours)}h</p></Card>
        <Card><p className="text-xs text-muted-foreground">Gross Payroll</p><p className="mt-2 text-2xl font-semibold">{money(data.totals.gross)}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Net Payroll</p><p className="mt-2 text-2xl font-semibold">{money(data.totals.net)}</p></Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Payroll Runs</p>
            <p className="text-xs text-muted-foreground">Completed runs are locked and cannot be regenerated.</p>
          </div>
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-b bg-secondary/50 text-left text-muted-foreground"><th className="px-3 py-2">Period</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Employees</th><th className="px-3 py-2">Approved Hours</th><th className="px-3 py-2">Gross</th><th className="px-3 py-2">Net</th></tr></thead>
            <tbody>
              {(data.runs || []).map((run) => (
                <tr key={run.id} className="border-b/50">
                  <td className="px-3 py-2">{period(run)}</td>
                  <td className="px-3 py-2">{run.status}</td>
                  <td className="px-3 py-2">{run._count?.items || 0}</td>
                  <td className="px-3 py-2">{Math.round(Number(run.summaryJson?.totals?.approvedHours || 0))}h</td>
                  <td className="px-3 py-2">{money(run.summaryJson?.totals?.gross)}</td>
                  <td className="px-3 py-2 font-medium">{money(run.summaryJson?.totals?.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.runs?.length ? <p className="p-6 text-center text-sm text-muted-foreground">No payroll runs generated yet.</p> : null}
        </div>
      </Card>

      {latest ? (
        <Card className="space-y-3">
          <p className="text-sm font-medium">Latest Payslips - {period(latest)}</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[980px] text-sm">
              <thead><tr className="border-b bg-secondary/50 text-left text-muted-foreground"><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Hours</th><th className="px-3 py-2">Base</th><th className="px-3 py-2">Rate</th><th className="px-3 py-2">Allowances</th><th className="px-3 py-2">Deductions</th><th className="px-3 py-2">Net</th><th className="px-3 py-2">PDF</th></tr></thead>
              <tbody>
                {(latest.items || []).map((item) => (
                  <tr key={item.id} className="border-b/50">
                    <td className="px-3 py-2">{item.employee ? `${item.employee.employeeCode} - ${item.employee.firstName} ${item.employee.lastName}` : item.employeeId}</td>
                    <td className="px-3 py-2">{item.calculationType}</td>
                    <td className="px-3 py-2">{Number(item.approvedHours)}h</td>
                    <td className="px-3 py-2">{money(item.baseSalary)}</td>
                    <td className="px-3 py-2">{item.hourlyRate || item.perHourRate ? money(item.hourlyRate || item.perHourRate) : "-"}</td>
                    <td className="px-3 py-2">{money(item.allowances)}</td>
                    <td className="px-3 py-2">{money(item.deductions)}</td>
                    <td className="px-3 py-2 font-medium">{money(item.netPay)}</td>
                    <td className="px-3 py-2"><Link href={`/api/payslip/${item.id}`} target="_blank" className="inline-flex items-center gap-2 text-primary"><Download className="h-4 w-4" /> PDF</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </section>
  );
}

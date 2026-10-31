"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function money(value: unknown) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default function PayslipsPage() {
  const { data, loading, error } = useApi<any[]>("/api/payroll/payslips", []);
  return (
    <section className="space-y-4">
      <PageHeader title="Payslips" subtitle="Locked payroll PDFs generated from approved timesheets." />
      {error ? <Card className="text-sm text-destructive">{error}</Card> : null}
      {loading ? <Skeleton className="h-40 w-full" /> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Hours</th>
                <th className="px-3 py-2">Gross</th>
                <th className="px-3 py-2">Deductions</th>
                <th className="px-3 py-2">Net</th>
                <th className="px-3 py-2">PDF</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((p) => (
                <tr key={p.id} className="border-b/50">
                  <td className="px-3 py-2">{String(p.month).padStart(2, "0")}/{p.year}</td>
                  <td className="px-3 py-2">{p.payrollItem?.calculationType || "FIXED"}</td>
                  <td className="px-3 py-2">{Number(p.payrollItem?.approvedHours || 0)}h</td>
                  <td className="px-3 py-2">{money(p.payrollItem?.grossPay)}</td>
                  <td className="px-3 py-2">{money(p.payrollItem?.deductions)}</td>
                  <td className="px-3 py-2 font-medium">{money(p.payrollItem?.netPay)}</td>
                  <td className="px-3 py-2"><Link href={`/api/payslip/${p.payrollItem?.id}`} target="_blank" className="inline-flex items-center gap-2 text-primary"><Download className="h-4 w-4" /> Download</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.length ? <p className="p-6 text-center text-sm text-muted-foreground">No completed payslips yet.</p> : null}
        </Card>
      )}
    </section>
  );
}

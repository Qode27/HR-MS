"use client";

import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";

export default function PayslipsPage() {
  const { data } = useApi<any[]>("/api/payroll/payslips", []);
  return (
    <section className="space-y-4">
      <PageHeader title="Payslips" subtitle="Completed payroll periods visible only to the signed-in employee." />
      <DataTable rows={(data || []).map((p) => ({ month: p.month, year: p.year, gross: Number(p.payrollItem?.grossPay || 0), deductions: Number(p.payrollItem?.deductions || 0), net: Number(p.payrollItem?.netPay || 0), status: "Completed" }))} columns={[{ key: "month", label: "Month" }, { key: "year", label: "Year" }, { key: "gross", label: "Gross" }, { key: "deductions", label: "Deductions" }, { key: "net", label: "Net" }, { key: "status", label: "Status" }]} />
    </section>
  );
}

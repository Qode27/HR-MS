"use client";

import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";

export default function PayslipsPage() {
  const { data } = useApi<any[]>("/api/payroll/payslips", []);
  return (
    <section className="space-y-4">
      <PageHeader title="Payslips" subtitle="Download your monthly payslips" />
      <DataTable rows={(data || []).map((p) => ({ ...p, gross: p.payrollItem?.grossPay, deductions: p.payrollItem?.deductions, net: p.payrollItem?.netPay }))} columns={[{ key: "month", label: "Month" }, { key: "year", label: "Year" }, { key: "gross", label: "Gross" }, { key: "deductions", label: "Deductions" }, { key: "net", label: "Net" }, { key: "pdfPath", label: "PDF Path" }]} />
    </section>
  );
}

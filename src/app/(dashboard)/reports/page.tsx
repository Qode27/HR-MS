"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";

type ReportDefinition = {
  key: string;
  title: string;
  group: string;
  description: string;
  columns: string[];
  filters: string[];
  exportable: boolean;
};

type ReportData = {
  definition: ReportDefinition;
  filters: { month: number; year: number; departmentId?: string | null };
  rows: Record<string, unknown>[];
};

export default function ReportsPage() {
  const { data: catalog } = useApi<ReportDefinition[]>("/api/reports/catalog", []);
  const [selectedKey, setSelectedKey] = useState("employee-master");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/data?key=${selectedKey}&month=${month}&year=${year}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || json.success === false) throw new Error(json.error?.message || "Unable to load report");
        setReportData(json.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load report");
      } finally {
        setLoading(false);
      }
    }

    void loadReport();
  }, [month, selectedKey, year]);

  function exportReport(format: "csv" | "xlsx") {
    window.location.href = `/api/reports/export?key=${selectedKey}&month=${month}&year=${year}&format=${format}`;
  }

  return (
    <section className="space-y-4">
      <PageHeader
        title="Reports Center"
        subtitle="Choose a defined business report, apply valid filters, and export only supported outputs."
        actions={
          <div className="flex flex-wrap gap-2">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={month} onChange={(e) => setMonth(e.target.value)}>
              {Array.from({ length: 12 }).map((_, index) => <option key={index + 1} value={index + 1}>{String(index + 1).padStart(2, "0")}</option>)}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={year} onChange={(e) => setYear(e.target.value)}>
              {[2025, 2026, 2027].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <Button variant="outline" onClick={() => exportReport("csv")}>Export CSV</Button>
            <Button onClick={() => exportReport("xlsx")}>Export Excel</Button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(catalog || []).map((report) => (
          <button
            key={report.key}
            type="button"
            onClick={() => setSelectedKey(report.key)}
            className={`rounded-xl border p-4 text-left transition ${selectedKey === report.key ? "border-primary bg-primary/5" : "hover:bg-secondary/50"}`}
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{report.group}</p>
            <p className="mt-2 font-medium">{report.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
          </button>
        ))}
      </div>

      <Card className="space-y-3">
        <div>
          <p className="text-sm font-medium">{reportData?.definition.title || "Selected Report"}</p>
          <p className="text-xs text-muted-foreground">{reportData?.definition.description || "Loading report definition..."}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Filters: {(reportData?.definition.filters || []).length ? reportData?.definition.filters.join(", ") : "None"}</span>
          <span>Columns: {(reportData?.definition.columns || []).join(", ")}</span>
        </div>
        {loading ? (
          <div className="h-40 rounded-xl border bg-secondary/40" />
        ) : reportData?.rows?.length ? (
          <DataTable rows={reportData.rows} columns={Object.keys(reportData.rows[0]).map((key) => ({ key: key as keyof typeof reportData.rows[0], label: key.replaceAll(/([A-Z])/g, " $1") }))} />
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No data available for the selected filters.</div>
        )}
      </Card>
    </section>
  );
}

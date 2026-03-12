"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AttendancePage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [q, setQ] = useState("");
  const { data } = useApi<any>(`/api/attendance?page=1&pageSize=200&month=${month}&year=${year}&q=${encodeURIComponent(q)}`, [month, year, q]);

  async function mark() {
    const res = await fetch("/api/attendance", { method: "POST" });
    const json = await res.json();
    if (!res.ok || json.success === false) return toast.error(json.error?.message || "Failed");
    toast.success(json.data?.message || "Attendance updated");
    window.location.reload();
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Attendance Overview" subtitle="Track daily check-ins and work hours" actions={<Button onClick={mark}>Check In / Out</Button>} />
      <div className="grid gap-2 rounded-xl border bg-card/70 p-3 md:grid-cols-4">
        <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value || "1"))} placeholder="Month" />
        <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value || new Date().getFullYear()))} placeholder="Year" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employee" />
        <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Card><p className="text-xs text-muted-foreground">Present</p><p className="text-xl font-semibold">{data?.summary?.present || 0}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Absent</p><p className="text-xl font-semibold">{data?.summary?.absent || 0}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Half Day</p><p className="text-xl font-semibold">{data?.summary?.halfDay || 0}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Avg Work Mins</p><p className="text-xl font-semibold">{data?.summary?.averageWorkMinutes || 0}</p></Card>
      </div>
      <DataTable
        rows={(data?.items || []).map((x: any) => ({
          id: x.id,
          date: new Date(x.date).toLocaleDateString(),
          employee: `${x.employee?.firstName || ""} ${x.employee?.lastName || ""}`,
          status: x.status,
          checkIn: x.checkIn ? new Date(x.checkIn).toLocaleTimeString() : "-",
          checkOut: x.checkOut ? new Date(x.checkOut).toLocaleTimeString() : "-",
          workMinutes: x.workMinutes,
          overtime: Math.max(0, (x.workMinutes || 0) - 480)
        }))}
        columns={[
          { key: "date", label: "Date" },
          { key: "employee", label: "Employee" },
          { key: "status", label: "Status" },
          { key: "checkIn", label: "Check-In" },
          { key: "checkOut", label: "Check-Out" },
          { key: "workMinutes", label: "Work Mins" },
          { key: "overtime", label: "Overtime" }
        ]}
      />
    </section>
  );
}

"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

type DataTableProps<T> = {
  rows: T[];
  columns: Array<{ key: keyof T; label: string }>;
};

export function DataTable<T extends Record<string, unknown>>({ rows, columns }: DataTableProps<T>) {
  const [q, setQ] = useState("");
  const filtered = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="rounded-xl border bg-card/70">
      <div className="border-b p-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter table" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              {columns.map((c) => (
                <th key={String(c.key)} className="px-3 py-2 font-medium">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="border-b/50 hover:bg-secondary/40">
                {columns.map((c) => (
                  <td key={String(c.key)} className="px-3 py-2">{String(row[c.key] ?? "-")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No records found.</p> : null}
    </div>
  );
}

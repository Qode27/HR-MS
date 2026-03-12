"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCommandPaletteStore } from "@/store/command-palette";

const items = [
  ["Dashboard", "/dashboard"],
  ["Employees", "/employees"],
  ["Attendance", "/attendance"],
  ["Leave", "/leave"],
  ["Payroll", "/payroll"],
  ["ATS Pipeline", "/ats/candidates/pipeline"],
  ["Onboarding", "/onboarding"],
  ["Reports", "/reports"]
] as const;

export function CommandPalette() {
  const { open, setOpen } = useCommandPaletteStore();
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const filtered = useMemo(() => items.filter((x) => x[0].toLowerCase().includes(q.toLowerCase())), [q]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4" onClick={() => setOpen(false)}>
      <div className="mx-auto mt-20 max-w-xl rounded-xl border bg-card p-3" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Jump to..."
          className="mb-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
        />
        <div className="max-h-72 space-y-1 overflow-auto">
          {filtered.map(([label, href]) => (
            <Link key={href} href={href} className="block rounded px-3 py-2 text-sm hover:bg-secondary" onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

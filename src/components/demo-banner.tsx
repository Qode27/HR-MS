"use client";

import { isDemoBannerVisible } from "@/lib/demo";

export function DemoBanner() {
  if (!isDemoBannerVisible()) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      🚀 Demo Mode: Sample data only. No changes are saved.
    </div>
  );
}

"use client";

import { Card } from "@/components/ui/card";

export function StatCard({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <Card className="space-y-2">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

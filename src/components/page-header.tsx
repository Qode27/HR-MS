import { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="sticky top-16 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/75 px-4 py-3 backdrop-blur">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

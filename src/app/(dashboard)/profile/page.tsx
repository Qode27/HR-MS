"use client";

import { useApi } from "@/hooks/use-api";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type MeResponse = {
  sub: string;
  role: string;
  email: string;
  name: string;
  typ?: string;
  iat?: number;
  exp?: number;
};

function formatUnixTime(value?: number) {
  if (!value) return "-";
  return new Date(value * 1000).toLocaleString();
}

export default function ProfilePage() {
  const { data, loading } = useApi<MeResponse>("/api/auth/me", []);

  const initials = data?.name
    ?.split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="space-y-4">
      <PageHeader title="Profile" subtitle="Account and role details" />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">
              {loading ? <Skeleton className="h-6 w-8" /> : initials || "U"}
            </div>
            <div className="min-w-0">
              {loading ? (
                <>
                  <Skeleton className="mb-2 h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                </>
              ) : (
                <>
                  <p className="truncate text-lg font-semibold">{data?.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{data?.email}</p>
                </>
              )}
            </div>
          </div>
          <div className="grid gap-3 text-sm">
            <div className="rounded-lg border bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
              <p className="mt-1 font-medium">{loading ? "Loading..." : data?.role}</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">User ID</p>
              <p className="mt-1 break-all font-mono text-xs">{loading ? "Loading..." : data?.sub}</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">Session Details</h2>
            <p className="text-sm text-muted-foreground">Current login token metadata.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Token Type</p>
              <p className="mt-1 font-medium">{loading ? "Loading..." : data?.typ || "-"}</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Issued At</p>
              <p className="mt-1 font-medium">{loading ? "Loading..." : formatUnixTime(data?.iat)}</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Expires At</p>
              <p className="mt-1 font-medium">{loading ? "Loading..." : formatUnixTime(data?.exp)}</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="mt-1 font-medium text-emerald-600">{loading ? "Loading..." : "Active"}</p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

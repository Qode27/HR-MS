"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";
import { hasPermission } from "@/lib/rbac";
import { navItems } from "@/lib/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoMode } from "@/lib/demo";

type MeResponse = { sub: string; role: string; email: string; name: string };

export function Sidebar() {
  const pathname = usePathname();
  const { data, loading } = useApi<MeResponse>("/api/auth/me", []);
  const isDemo = useDemoMode();
  const role = data?.role || "EMPLOYEE";
  const currentPath = pathname ?? "";
  const visibleNav = isDemo
    ? navItems
    : navItems.filter((item) => {
        if (!item.permission) return true;
        if (Array.isArray(item.permission)) return item.permission.some((perm) => hasPermission(role, perm));
        return hasPermission(role, item.permission);
      });

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r bg-card/80 p-4 backdrop-blur md:flex">
      <Link href="/dashboard" className="nav-link mb-6 flex cursor-pointer items-center gap-3 px-2">
        <div className="h-8 w-8 rounded bg-gradient-to-br from-cyan-500 to-emerald-500" />
        <div>
          <p className="text-sm font-semibold">PeopleFlow HR</p>
          <p className="text-xs text-muted-foreground">Enterprise Suite</p>
        </div>
      </Link>
      <nav className="space-y-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Skeleton key={idx} className="h-9 w-full" />
            ))}
          </div>
        ) : visibleNav.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">No menu items available for this role.</p>
        ) : visibleNav.map((item) => {
          const Icon = item.icon;
          const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={cn(
                "nav-link flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                active ? "bg-primary text-primary-foreground shadow" : "hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

import type { Route } from "next";
import { LayoutDashboard, Users, Clock3, CalendarDays, Wallet, BriefcaseBusiness, UserRoundPlus, FileText, BarChart3, Settings, UserCircle2, Target, Building2, CreditCard } from "lucide-react";

export type NavItem = {
  href: Route;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string | string[];
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard:read" },
  { href: "/clients", label: "Clients", icon: Building2, permission: "tenant:manage" },
  { href: "/reports", label: "Subscriptions", icon: CreditCard, permission: "subscription:manage" },
  { href: "/employees", label: "Employees", icon: Users, permission: "employee:read" },
  { href: "/timesheets", label: "Timesheets", icon: Clock3, permission: ["timesheet:read", "timesheet:approve"] },
  { href: "/my-timesheets", label: "My Timesheets", icon: Clock3, permission: "timesheet:self" },
  { href: "/leave", label: "Leave Management", icon: CalendarDays, permission: "leave:manage" },
  { href: "/team-leave", label: "Team Leave", icon: CalendarDays, permission: "leave:team" },
  { href: "/my-leave", label: "My Leave", icon: CalendarDays, permission: "leave:self" },
  { href: "/payroll", label: "Payroll", icon: Wallet, permission: ["payroll:manage", "payroll:read"] },
  { href: "/payroll/payslips", label: "Payslips", icon: Wallet, permission: "payroll:self" },
  { href: "/ats", label: "ATS", icon: BriefcaseBusiness, permission: "ats:manage" },
  { href: "/onboarding", label: "Onboarding", icon: UserRoundPlus, permission: "onboarding:manage" },
  { href: "/performance", label: "Performance", icon: Target, permission: "employee:read" },
  { href: "/documents", label: "Documents", icon: FileText, permission: ["documents:manage", "documents:read", "documents:self"] },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports:read" },
  { href: "/settings", label: "Settings", icon: Settings, permission: ["settings:platform", "settings:manage"] },
  { href: "/profile", label: "Profile", icon: UserCircle2, permission: "dashboard:read" }
];

const dashboardRoutePaths = new Set([
  "/dashboard",
  "/clients",
  "/employees",
  "/timesheets",
  "/my-timesheets",
  "/attendance",
  "/leave",
  "/team-leave",
  "/my-leave",
  "/payroll",
  "/payroll/payslips",
  "/ats",
  "/onboarding",
  "/performance",
  "/documents",
  "/reports",
  "/settings",
  "/profile"
]);

export function getNavPath(href: Route | string) {
  return String(href).split("?")[0].split("#")[0];
}

export function getInvalidNavItems(items: NavItem[] = navItems) {
  return items.filter((item) => !dashboardRoutePaths.has(getNavPath(item.href)));
}

if (process.env.NODE_ENV !== "production") {
  const invalidItems = getInvalidNavItems();
  if (invalidItems.length > 0) {
    throw new Error(
      `Invalid sidebar route(s): ${invalidItems
        .map((item) => `${item.label} -> ${item.href}`)
        .join(", ")}. Add a matching App Router page or correct the navigation href.`
    );
  }
}

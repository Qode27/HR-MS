import type { Route } from "next";
import { LayoutDashboard, Users, CalendarClock, CalendarDays, Wallet, BriefcaseBusiness, UserRoundPlus, FileText, BarChart3, Settings, UserCircle2, Target } from "lucide-react";

export type NavItem = {
  href: Route;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string | string[];
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard:read" },
  { href: "/employees", label: "Employees", icon: Users, permission: "employee:read" },
  { href: "/attendance", label: "Attendance", icon: CalendarClock, permission: ["attendance:read", "attendance:self"] },
  { href: "/leave", label: "Leave", icon: CalendarDays, permission: ["leave:self", "leave:manage", "leave:approve"] },
  { href: "/payroll", label: "Payroll", icon: Wallet, permission: ["payroll:self", "payroll:manage", "payroll:read"] },
  { href: "/ats", label: "ATS", icon: BriefcaseBusiness, permission: "ats:manage" },
  { href: "/onboarding", label: "Onboarding", icon: UserRoundPlus, permission: "onboarding:manage" },
  { href: "/performance", label: "Performance", icon: Target, permission: "employee:read" },
  { href: "/documents", label: "Documents", icon: FileText, permission: ["documents:manage", "documents:read", "documents:self"] },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports:read" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings:manage" },
  { href: "/profile", label: "Profile", icon: UserCircle2 }
];

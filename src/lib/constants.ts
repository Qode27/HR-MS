export const COOKIE_NAME = "pfhr_session";
export const REFRESH_COOKIE_NAME = "pfhr_refresh";

export const AUTH_ROUTES = ["/login", "/forgot-password", "/careers"];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  MASTER_ADMIN: [
    "dashboard:read",
    "dashboard:platform",
    "platform:read",
    "platform:manage",
    "tenant:read",
    "tenant:manage",
    "subscription:manage",
    "reports:read",
    "settings:platform",
    "settings:manage"
  ],
  SUPER_ADMIN: [
    "dashboard:read",
    "dashboard:company",
    "settings:manage",
    "employee:read",
    "employee:manage",
    "timesheet:read",
    "timesheet:manage",
    "timesheet:approve",
    "leave:manage",
    "leave:approve",
    "payroll:read",
    "payroll:manage",
    "ats:manage",
    "onboarding:manage",
    "documents:read",
    "documents:manage",
    "reports:read"
  ],
  EMPLOYEE: [
    "dashboard:read",
    "dashboard:self",
    "self:read",
    "self:update",
    "timesheet:self",
    "leave:self",
    "payroll:self",
    "documents:self"
  ],
  ADMIN: [
    "dashboard:read",
    "dashboard:company",
    "settings:manage",
    "employee:read",
    "employee:manage",
    "timesheet:read",
    "timesheet:manage",
    "timesheet:approve",
    "leave:manage",
    "leave:approve",
    "payroll:read",
    "payroll:manage",
    "ats:manage",
    "onboarding:manage",
    "documents:read",
    "documents:manage",
    "reports:read"
  ],
  HR_ADMIN: [
    "dashboard:read",
    "dashboard:company",
    "employee:read",
    "employee:manage",
    "timesheet:read",
    "timesheet:manage",
    "timesheet:approve",
    "leave:manage",
    "leave:approve",
    "onboarding:manage",
    "ats:manage",
    "documents:read",
    "documents:manage",
    "reports:read"
  ],
  RECRUITER: ["dashboard:read", "dashboard:company", "ats:manage", "employee:read"],
  MANAGER: ["dashboard:read", "dashboard:team", "team:read", "employee:team", "timesheet:self", "timesheet:read", "timesheet:approve", "leave:approve", "leave:team"]
};

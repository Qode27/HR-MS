export const COOKIE_NAME = "pfhr_session";
export const REFRESH_COOKIE_NAME = "pfhr_refresh";

export const AUTH_ROUTES = ["/login", "/forgot-password", "/careers"];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["*"],
  HR_ADMIN: [
    "dashboard:read",
    "employee:read",
    "employee:manage",
    "attendance:read",
    "attendance:manage",
    "leave:self",
    "leave:manage",
    "leave:approve",
    "payroll:self",
    "payroll:manage",
    "onboarding:manage",
    "ats:manage",
    "reports:read",
    "settings:manage"
  ],
  RECRUITER: ["dashboard:read", "ats:manage", "onboarding:manage", "employee:read", "attendance:read"],
  MANAGER: ["dashboard:read", "team:read", "leave:approve", "attendance:read", "ats:collaborate", "employee:read"],
  EMPLOYEE: ["dashboard:read", "self:read", "self:update", "attendance:self", "leave:self", "payroll:self"]
};

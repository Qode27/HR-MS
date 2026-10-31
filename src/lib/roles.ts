export type AppRole = "MASTER_ADMIN" | "SUPER_ADMIN" | "ADMIN" | "HR_ADMIN" | "RECRUITER" | "MANAGER" | "EMPLOYEE";

export const ROLE_LABELS: Record<AppRole, string> = {
  MASTER_ADMIN: "Master Admin",
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  HR_ADMIN: "HR Admin",
  RECRUITER: "Recruiter",
  MANAGER: "Manager",
  EMPLOYEE: "Employee"
};

export function normalizeRole(role?: string): AppRole {
  switch (role) {
    case "MASTER_ADMIN":
    case "SUPER_ADMIN":
    case "ADMIN":
    case "HR_ADMIN":
    case "RECRUITER":
    case "MANAGER":
    case "EMPLOYEE":
      return role;
    default:
      return "EMPLOYEE";
  }
}

export function isAdminRole(role?: string) {
  const normalized = normalizeRole(role);
  return normalized === "MASTER_ADMIN" || normalized === "SUPER_ADMIN" || normalized === "ADMIN" || normalized === "HR_ADMIN";
}

export function isEmployeeOnlyRole(role?: string) {
  return normalizeRole(role) === "EMPLOYEE";
}

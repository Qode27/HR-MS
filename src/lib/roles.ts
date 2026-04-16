export type AppRole = "SUPER_ADMIN" | "HR_ADMIN" | "RECRUITER" | "MANAGER" | "EMPLOYEE";

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  HR_ADMIN: "HR Admin",
  RECRUITER: "Recruiter",
  MANAGER: "Manager",
  EMPLOYEE: "Employee"
};

export function normalizeRole(role?: string): AppRole {
  switch (role) {
    case "SUPER_ADMIN":
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
  return normalized === "SUPER_ADMIN" || normalized === "HR_ADMIN";
}

export function isEmployeeOnlyRole(role?: string) {
  return normalizeRole(role) === "EMPLOYEE";
}

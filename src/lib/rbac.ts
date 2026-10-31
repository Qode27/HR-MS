import { ROLE_PERMISSIONS } from "@/lib/constants";

export function hasPermission(role: string, permission: string) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes("*") || perms.includes(permission);
}

export async function hasPermissionDynamic(role: string, permission: string) {
  return hasPermission(role, permission);
}

export function requirePermission(role: string, permission: string) {
  if (!hasPermission(role, permission)) {
    throw new Error("FORBIDDEN");
  }
}

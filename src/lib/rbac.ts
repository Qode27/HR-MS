import { ROLE_PERMISSIONS } from "@/lib/constants";

type CacheItem = { permissions: string[]; expiresAt: number };
const rolePermissionCache = new Map<string, CacheItem>();

export function hasPermission(role: string, permission: string) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes("*") || perms.includes(permission);
}

export async function hasPermissionDynamic(role: string, permission: string) {
  if (hasPermission(role, permission)) return true;

  const cached = rolePermissionCache.get(role);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.permissions.includes(permission) || cached.permissions.includes("*");
  }

  const { prisma } = await import("@/lib/db");
  const roleRow = await prisma.role.findUnique({
    where: { name: role as never },
    include: { permissions: { include: { permission: true } } }
  });
  const permissions = roleRow?.permissions.map((p) => p.permission.key) || [];
  rolePermissionCache.set(role, { permissions, expiresAt: now + 60_000 });
  return permissions.includes(permission) || permissions.includes("*");
}

export function requirePermission(role: string, permission: string) {
  if (!hasPermission(role, permission)) {
    throw new Error("FORBIDDEN");
  }
}

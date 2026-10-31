import type { SessionPayload } from "@/lib/auth";

export function tenantWhere(session?: Pick<SessionPayload, "role" | "tenantId"> | null) {
  if (!session || session.role === "MASTER_ADMIN") return {};
  return { tenantId: session.tenantId ?? "__missing_tenant__" };
}

export function requireTenantId(session?: Pick<SessionPayload, "role" | "tenantId"> | null) {
  if (session?.role === "MASTER_ADMIN") return undefined;
  if (!session?.tenantId) throw new Error("TENANT_REQUIRED");
  return session.tenantId;
}

export function attachTenant<T extends Record<string, unknown>>(data: T, tenantId?: string | null) {
  return tenantId ? { ...data, tenantId } : data;
}

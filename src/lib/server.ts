import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { fail } from "@/lib/http";
import { hasPermissionDynamic } from "@/lib/rbac.server";

export async function withPermission(req: NextRequest, permission: string) {
  const session = await getSession();
  if (!session) return { error: fail("Unauthorized", 401) };
  if (!(await hasPermissionDynamic(session.role, permission))) return { error: fail("Forbidden", 403) };
  return { session };
}

export async function parseJson<T>(req: NextRequest): Promise<T> {
  return req.json() as Promise<T>;
}

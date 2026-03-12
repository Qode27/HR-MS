import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/http";
import { withPermission } from "@/lib/server";

export async function GET(req: NextRequest) {
  const access = await withPermission(req, "settings:manage");
  if (access.error) return access.error;

  const [departments, designations, leaveTypes, shifts, workLocations] = await Promise.all([
    prisma.department.findMany(),
    prisma.designation.findMany(),
    prisma.leaveType.findMany(),
    prisma.shift.findMany(),
    prisma.workLocation.findMany()
  ]);

  return ok({ departments, designations, leaveTypes, shifts, workLocations });
}

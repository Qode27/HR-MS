import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/http";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  if (!payload.jobOpeningId || !payload.fullName || !payload.email) return fail("Missing required fields", 422);

  const duplicateHash = crypto.createHash("sha256").update(`${payload.email}:${payload.phone || ""}`).digest("hex");
  const exists = await prisma.candidate.findFirst({ where: { duplicateHash } });
  if (exists) return fail("Duplicate candidate", 409);

  const candidate = await prisma.candidate.create({
    data: {
      jobOpeningId: payload.jobOpeningId,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      source: "CAREERS_PORTAL",
      skills: payload.skills || [],
      education: payload.education,
      parsedResume: {
        name: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        skills: payload.skills || []
      },
      duplicateHash
    }
  });

  return ok(candidate, 201);
}

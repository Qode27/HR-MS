import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { candidateCreateSchema } from "@/lib/validators/schemas";
import { AtsController } from "@backend/controllers/ats.controller";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { parseBody } from "@backend/utils/request";
import { AppError } from "@backend/utils/errors";
import { success } from "@backend/utils/api-response";

const controller = new AtsController();

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "ats:manage");
  return controller.candidates(req);
});

export const POST = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "ats:manage");
  const payload = parseBody(candidateCreateSchema, await req.json());

  const hash = crypto.createHash("sha256").update(`${payload.email}:${payload.phone || ""}`).digest("hex");
  const duplicate = await prisma.candidate.findFirst({ where: { duplicateHash: hash } });
  if (duplicate) throw new AppError("Duplicate candidate detected", 409);

  const candidate = await prisma.candidate.create({
    data: {
      ...payload,
      duplicateHash: hash,
      parsedResume: {
        name: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        skills: payload.skills,
        experience: payload.totalExperience,
        education: payload.education
      },
      activity: {
        create: {
          action: "Candidate created",
          meta: { stage: "APPLIED" }
        }
      }
    }
  });

  return success(candidate, undefined, 201);
});

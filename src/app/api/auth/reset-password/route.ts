import { NextRequest } from "next/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validators/schemas";
import { parseBody } from "@backend/utils/request";
import { success } from "@backend/utils/api-response";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { AppError } from "@backend/utils/errors";
import { writeAuditLog } from "@/lib/services/audit.service";

export const POST = withApiGuard(async (req: NextRequest) => {
  const payload = parseBody(resetPasswordSchema, await req.json());
  const tokenHash = crypto.createHash("sha256").update(payload.token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetToken: tokenHash,
      resetTokenExp: { gt: new Date() }
    }
  });
  if (!user) throw new AppError("Invalid or expired reset token", 400);

  const passwordHash = await bcrypt.hash(payload.password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExp: null
    }
  });

  await writeAuditLog({ userId: user.id, action: "PASSWORD_RESET", module: "AUTH", entityId: user.id });
  return success({ message: "Password reset successful" });
});

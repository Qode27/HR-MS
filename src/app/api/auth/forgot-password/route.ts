import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { isRateLimited } from "@backend/middleware/rate-limit";
import { success, failure } from "@backend/utils/api-response";
import { getIp } from "@backend/utils/request";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@backend/services/email.service";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const ip = getIp(req);
  if (isRateLimited(`forgot-password:${ip}`, 5, 60_000)) return failure("Too many requests", 429);
  if (!email || typeof email !== "string") return failure("Email is required", 422);

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 30);
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: tokenHash, resetTokenExp: expiry }
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await sendPasswordResetEmail({ email, resetUrl: `${baseUrl}/reset-password?token=${token}` });
  }

  return success({ message: "If account exists, reset email has been sent." });
}

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validators/schemas";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/constants";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { parseBody, getIp } from "@backend/utils/request";
import { AppError } from "@backend/utils/errors";
import { isRateLimited } from "@backend/middleware/rate-limit";
import { success } from "@backend/utils/api-response";
import { logger } from "@backend/utils/logger";

export const POST = withApiGuard(async (req: NextRequest) => {
  const ip = getIp(req);
  if (isRateLimited(`auth:${ip}`, 8, 60_000)) {
    await logger.security("Login rate limit hit", { ip });
    throw new AppError("Too many login attempts. Try again shortly.", 429);
  }

  const payload = parseBody(loginSchema, await req.json());
  const user = await prisma.user.findUnique({ where: { email: payload.email }, include: { role: true } });
  if (!user) throw new AppError("Invalid credentials", 401);

  const valid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!valid) {
    await logger.security("Failed login", { email: payload.email, ip });
    throw new AppError("Invalid credentials", 401);
  }

  const authPayload = {
    sub: user.id,
    role: user.role.name,
    email: user.email,
    name: user.fullName
  };
  const accessToken = await signAccessToken(authPayload);
  const refreshToken = await signRefreshToken(authPayload);

  const res = success({ user: { id: user.id, email: user.email, name: user.fullName, role: user.role.name } });
  res.cookies.set(COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 15,
    path: "/"
  });
  res.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });

  return res;
});

import { NextRequest } from "next/server";
import { getRefreshSession, signAccessToken, signRefreshToken } from "@/lib/auth";
import { COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/constants";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { AppError } from "@backend/utils/errors";
import { success } from "@backend/utils/api-response";

export const POST = withApiGuard(async (_req: NextRequest) => {
  const session = await getRefreshSession();
  if (!session) throw new AppError("Unauthorized", 401);

  const accessToken = await signAccessToken(session);
  const refreshToken = await signRefreshToken(session);

  const res = success({ refreshed: true });
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

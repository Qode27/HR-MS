import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/constants";

const publicPaths = ["/login", "/forgot-password", "/reset-password", "/careers", "/api/auth/login", "/api/auth/refresh", "/api/auth/reset-password", "/api/health"];
const authBucket = new Map<string, { hits: number; resetAt: number }>();

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/api/public")) {
    return NextResponse.next();
  }

  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const accessToken = req.cookies.get(COOKIE_NAME)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
  const hasAnySessionToken = Boolean(accessToken || refreshToken);

  if (!hasAnySessionToken && !isPublic && !pathname.startsWith("/api/auth/forgot-password") && !pathname.startsWith("/api/auth/logout")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (hasAnySessionToken && (pathname === "/login" || pathname === "/forgot-password" || pathname === "/reset-password")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/api/auth/login")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const bucket = authBucket.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      authBucket.set(ip, { hits: 1, resetAt: now + 60_000 });
    } else {
      bucket.hits += 1;
      if (bucket.hits > 20) {
        return NextResponse.json({ success: false, error: { message: "Too many requests" } }, { status: 429 });
      }
    }
  }

  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
  );
  return res;
}

export const config = {
  matcher: ["/:path*"]
};

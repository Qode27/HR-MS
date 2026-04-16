import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAME, REFRESH_COOKIE_NAME, ROLE_PERMISSIONS } from "@/lib/constants";

const publicPaths = ["/login", "/forgot-password", "/reset-password", "/careers", "/api/auth/login", "/api/auth/refresh", "/api/auth/reset-password", "/api/health"];
const authBucket = new Map<string, { hits: number; resetAt: number }>();
const encoder = new TextEncoder();
const secret = encoder.encode(process.env.JWT_SECRET || "dev-secret-change-me");
const demoCookieName = "hrms_demo";
const routePermissions: Array<{ prefix: string; permissions: string[] }> = [
  { prefix: "/employees", permissions: ["employee:read"] },
  { prefix: "/attendance", permissions: ["attendance:read", "attendance:self"] },
  { prefix: "/leave", permissions: ["leave:self", "leave:manage", "leave:approve"] },
  { prefix: "/payroll", permissions: ["payroll:self", "payroll:manage", "payroll:read"] },
  { prefix: "/ats", permissions: ["ats:manage"] },
  { prefix: "/onboarding", permissions: ["onboarding:manage"] },
  { prefix: "/performance", permissions: ["employee:read"] },
  { prefix: "/documents", permissions: ["documents:self", "documents:read", "documents:manage"] },
  { prefix: "/reports", permissions: ["reports:read"] },
  { prefix: "/settings", permissions: ["settings:manage"] }
];

function roleHasPermission(role: string, permission: string) {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes("*") || allowed.includes(permission);
}

async function resolveSession(accessToken?: string, refreshToken?: string) {
  const verifyToken = async (token: string, expectedType: "access" | "refresh") => {
    try {
      const { payload } = await jwtVerify(token, secret);
      return payload.typ === expectedType ? payload : null;
    } catch {
      return null;
    }
  };

  if (accessToken) {
    const payload = await verifyToken(accessToken, "access");
    if (payload) return payload;
  }
  if (refreshToken) {
    const payload = await verifyToken(refreshToken, "refresh");
    if (payload) return payload;
  }
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isDemo = req.nextUrl.searchParams.get("demo") === "true" || req.cookies.get(demoCookieName)?.value === "true" || pathname.startsWith("/hrms/demo");
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/api/public")) {
    return NextResponse.next();
  }

  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const accessToken = req.cookies.get(COOKIE_NAME)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
  const session = await resolveSession(accessToken, refreshToken);
  const hasAnySessionToken = Boolean(session);

  if (!hasAnySessionToken && !isPublic && !isDemo && !pathname.startsWith("/api/auth/forgot-password") && !pathname.startsWith("/api/auth/logout")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (session && !pathname.startsWith("/api/")) {
    const required = routePermissions.find((route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`));
    const role = typeof session.role === "string" ? session.role : undefined;
    if (required && role && !required.permissions.some((permission) => roleHasPermission(role, permission)) && !isDemo) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if ((hasAnySessionToken || isDemo) && (pathname === "/login" || pathname === "/forgot-password" || pathname === "/reset-password")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isDemo && pathname.startsWith("/api/")) {
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

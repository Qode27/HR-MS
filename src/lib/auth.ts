import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/constants";

const encoder = new TextEncoder();
const secret = encoder.encode(process.env.JWT_SECRET || "dev-secret-change-me");

export type SessionPayload = {
  sub: string;
  role: string;
  email: string;
  name: string;
};

export async function signAccessToken(payload: SessionPayload) {
  return new SignJWT({ ...payload, typ: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setSubject(payload.sub)
    .sign(secret);
}

export async function signRefreshToken(payload: SessionPayload) {
  return new SignJWT({ sub: payload.sub, email: payload.email, role: payload.role, name: payload.name, typ: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if ((payload as Record<string, unknown>).typ && (payload as Record<string, unknown>).typ !== "access") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if ((payload as Record<string, unknown>).typ !== "refresh") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_NAME)?.value;
  if (accessToken) {
    const access = await verifyAccessToken(accessToken);
    if (access) return access;
  }

  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  if (refreshToken) {
    const refresh = await verifyRefreshToken(refreshToken);
    if (refresh) return refresh;
  }

  return null;
}

export async function getRefreshSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyRefreshToken(token);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export const signSession = signAccessToken;
export const verifySession = verifyAccessToken;

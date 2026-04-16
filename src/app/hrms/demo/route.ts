import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/dashboard?demo=true", req.url));
  res.cookies.set("hrms_demo", "true", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24
  });
  return res;
}

import type { NextRequest } from "next/server";
import { ZodSchema } from "zod";
import { AppError } from "@backend/utils/errors";

export function parseBody<T>(schema: ZodSchema<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError("Validation failed", 422, { issues: parsed.error.flatten() });
  }
  return parsed.data;
}

export function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

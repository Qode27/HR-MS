import type { NextRequest } from "next/server";
import { failure } from "@backend/utils/api-response";
import { toAppError } from "@backend/utils/errors";
import { getIp } from "@backend/utils/request";
import { logger } from "@backend/utils/logger";

type Handler = (req: NextRequest, ctx?: unknown) => Promise<Response>;

export function withApiGuard(handler: Handler): Handler {
  return async (req: NextRequest, ctx?: unknown) => {
    const requestId = crypto.randomUUID();
    try {
      return await handler(req, ctx);
    } catch (error) {
      const appError = toAppError(error);
      await logger.error(appError.message, {
        requestId,
        status: appError.status,
        ip: getIp(req),
        details: appError.details
      });
      return failure(appError.message, appError.status, appError.details, { requestId });
    }
  };
}

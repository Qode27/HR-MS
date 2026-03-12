import { logger } from "@backend/utils/logger";

export async function sendPasswordResetEmail(input: { email: string; resetUrl: string }) {
  // Replace with SMTP/provider integration in production.
  await logger.info("Password reset email queued", { email: input.email, resetUrl: input.resetUrl });
}

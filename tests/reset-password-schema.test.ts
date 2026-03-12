import { describe, it, expect } from "vitest";
import { resetPasswordSchema } from "../src/lib/validators/schemas";

describe("Reset password schema", () => {
  it("accepts valid payload", () => {
    const parsed = resetPasswordSchema.safeParse({ token: "a".repeat(64), password: "StrongPass123" });
    expect(parsed.success).toBe(true);
  });

  it("rejects short token", () => {
    const parsed = resetPasswordSchema.safeParse({ token: "short", password: "StrongPass123" });
    expect(parsed.success).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "../src/lib/auth";

describe("Auth flow", () => {
  it("creates and verifies a session token", async () => {
    const token = await signSession({ sub: "u1", role: "SUPER_ADMIN", email: "a@b.com", name: "A" });
    const payload = await verifySession(token);
    expect(payload?.sub).toBe("u1");
    expect(payload?.role).toBe("SUPER_ADMIN");
  });
});

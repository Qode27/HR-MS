import { describe, it, expect } from "vitest";
import { isRateLimited } from "../backend/middleware/rate-limit";

describe("Rate limiting", () => {
  it("blocks after configured threshold", () => {
    const key = `test-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      expect(isRateLimited(key, 3, 60000)).toBe(false);
    }
    expect(isRateLimited(key, 3, 60000)).toBe(true);
  });
});

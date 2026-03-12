import { describe, it, expect } from "vitest";
import { leaveApplySchema } from "../src/lib/validators/schemas";

describe("Leave apply schema", () => {
  it("rejects reversed date range", () => {
    const parsed = leaveApplySchema.safeParse({
      leaveTypeId: "x",
      startDate: "2026-05-10",
      endDate: "2026-05-01",
      reason: "Trip"
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts valid date range", () => {
    const parsed = leaveApplySchema.safeParse({
      leaveTypeId: "x",
      startDate: "2026-05-01",
      endDate: "2026-05-10",
      reason: "Trip"
    });
    expect(parsed.success).toBe(true);
  });
});

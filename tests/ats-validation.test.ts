import { describe, it, expect } from "vitest";
import { candidateStageSchema } from "../src/lib/validators/schemas";

describe("ATS Validation", () => {
  it("accepts valid candidate stage", () => {
    const result = candidateStageSchema.safeParse({ stage: "JOINED" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid candidate stage", () => {
    const result = candidateStageSchema.safeParse({ stage: "INVALID_STAGE" });
    expect(result.success).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { candidateStageSchema } from "../src/lib/validators/schemas";

describe("ATS conversion precondition", () => {
  it("allows JOINED stage for conversion", () => {
    expect(candidateStageSchema.safeParse({ stage: "JOINED" }).success).toBe(true);
  });
});

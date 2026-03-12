import { describe, it, expect } from "vitest";
import { hasPermission } from "../src/lib/rbac";

describe("RBAC", () => {
  it("allows super admin everything", () => {
    expect(hasPermission("SUPER_ADMIN", "employee:manage")).toBe(true);
  });

  it("blocks employee from ats management", () => {
    expect(hasPermission("EMPLOYEE", "ats:manage")).toBe(false);
  });
});

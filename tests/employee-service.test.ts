import { describe, expect, it } from "vitest";
import { EmployeeService } from "../backend/services/employee.service";

describe("EmployeeService pagination", () => {
  it("normalizes page and page size", async () => {
    const service = new EmployeeService({
      list: async ({ skip, take }: { skip: number; take: number }) => ({ items: [{ id: "1" }], total: 1, skip, take }),
      create: async () => ({ id: "1" }),
      byId: async () => null
    } as any);

    const result = await service.list({ page: -10, pageSize: 1000 });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(100);
  });
});

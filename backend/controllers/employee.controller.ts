import { NextRequest } from "next/server";
import { success } from "@backend/utils/api-response";
import { EmployeeService } from "@backend/services/employee.service";
import { UserStatus } from "@prisma/client";

export class EmployeeController {
  constructor(private readonly service = new EmployeeService()) {}

  async list(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const data = await this.service.list({
      q: searchParams.get("q") || "",
      departmentId: searchParams.get("departmentId") || undefined,
      designationId: searchParams.get("designationId") || undefined,
      managerId: searchParams.get("managerId") || undefined,
      status: (searchParams.get("status") as UserStatus | null) || undefined,
      page: Number(searchParams.get("page") || "1"),
      pageSize: Number(searchParams.get("pageSize") || "10")
    });

    return success({
      items: data.items,
      page: data.page,
      pageSize: data.pageSize,
      total: data.total
    });
  }

  async detail(id: string) {
    const data = await this.service.detail(id);
    return success(data);
  }

  async bootstrap() {
    return success(await this.service.bootstrap());
  }
}

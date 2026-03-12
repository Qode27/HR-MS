import { EmployeeRepository } from "@backend/repositories/employee.repository";
import { UserStatus } from "@prisma/client";
import { AppError } from "@backend/utils/errors";

export class EmployeeService {
  constructor(private readonly repo = new EmployeeRepository()) {}

  async list(query: {
    q?: string;
    departmentId?: string;
    designationId?: string;
    managerId?: string;
    status?: UserStatus;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 10)));
    const skip = (page - 1) * pageSize;

    const result = await this.repo.list({
      q: query.q || "",
      departmentId: query.departmentId,
      designationId: query.designationId,
      managerId: query.managerId,
      status: query.status,
      skip,
      take: pageSize
    });
    return { ...result, page, pageSize };
  }

  async create(input: Parameters<EmployeeRepository["create"]>[0]) {
    for (let i = 0; i < 3; i++) {
      try {
        const code = await this.repo.nextEmployeeCode();
        return await this.repo.create({ ...input, employeeCode: code });
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("Unique constraint")) throw error;
      }
    }
    throw new AppError("Unable to generate unique employee code", 500);
  }

  async detail(id: string) {
    const data = await this.repo.byId(id);
    if (!data) throw new AppError("Employee not found", 404);
    return data;
  }

  update(id: string, data: Record<string, unknown>) {
    return this.repo.update(id, data);
  }

  addNote(employeeId: string, input: { title: string; description?: string; actorUserId?: string }) {
    return this.repo.addNote(employeeId, input);
  }

  addDocument(input: Parameters<EmployeeRepository["addDocument"]>[0]) {
    return this.repo.addDocument(input);
  }

  bootstrap() {
    return this.repo.bootstrap();
  }
}

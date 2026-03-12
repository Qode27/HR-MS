import { prisma } from "@/lib/db";
import { DocumentType, UserStatus } from "@prisma/client";

export class EmployeeRepository {
  async list(input: {
    q: string;
    departmentId?: string;
    designationId?: string;
    managerId?: string;
    status?: UserStatus;
    skip: number;
    take: number;
  }) {
    const where = {
      deletedAt: null,
      departmentId: input.departmentId || undefined,
      designationId: input.designationId || undefined,
      managerId: input.managerId || undefined,
      status: input.status || undefined,
      OR: [
        { firstName: { contains: input.q, mode: "insensitive" as const } },
        { lastName: { contains: input.q, mode: "insensitive" as const } },
        { employeeCode: { contains: input.q, mode: "insensitive" as const } }
      ]
    };

    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          department: true,
          designation: true,
          manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } }
        },
        orderBy: { createdAt: "desc" },
        skip: input.skip,
        take: input.take
      }),
      prisma.employee.count({ where })
    ]);

    return { items, total };
  }

  async nextEmployeeCode() {
    const year = new Date().getFullYear();
    const count = await prisma.employee.count();
    return `PF-${year}-${String(count + 1).padStart(5, "0")}`;
  }

  async create(data: {
    employeeCode?: string;
    firstName: string;
    lastName: string;
    personalEmail?: string;
    phone?: string;
    joiningDate: string;
    employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
    departmentId: string;
    designationId: string;
    managerId?: string;
    workLocationId?: string;
    salaryMonthly: number;
    skills: string[];
  }) {
    return prisma.employee.create({
      data: {
        ...data,
        employeeCode: data.employeeCode || (await this.nextEmployeeCode()),
        joiningDate: new Date(data.joiningDate)
      }
    });
  }

  async byId(id: string) {
    return prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, status: true } },
        department: true,
        designation: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        documents: { orderBy: { createdAt: "desc" } },
        timelineEvents: { orderBy: { createdAt: "desc" }, take: 50 },
        attendanceRecords: { orderBy: { date: "desc" }, take: 31 },
        leaveRequests: { include: { leaveType: true }, orderBy: { createdAt: "desc" }, take: 20 },
        payslips: { orderBy: { createdAt: "desc" }, take: 12 },
        payrollItems: { orderBy: { id: "desc" }, take: 12 },
        performanceGoals: { orderBy: { createdAt: "desc" }, take: 20 },
        performanceReviews: { orderBy: { createdAt: "desc" }, take: 20 }
      }
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    return prisma.employee.update({ where: { id }, data });
  }

  async addNote(employeeId: string, input: { title: string; description?: string; actorUserId?: string }) {
    return prisma.employeeEvent.create({
      data: { employeeId, title: input.title, description: input.description, actorUserId: input.actorUserId }
    });
  }

  async addDocument(input: {
    employeeId: string;
    type: DocumentType;
    fileName: string;
    filePath: string;
    uploadedById?: string;
  }) {
    const latest = await prisma.document.findFirst({
      where: { employeeId: input.employeeId, type: input.type },
      orderBy: { version: "desc" }
    });
    const nextVersion = (latest?.version || 0) + 1;
    return prisma.document.create({
      data: {
        employeeId: input.employeeId,
        type: input.type,
        fileName: input.fileName,
        filePath: input.filePath,
        uploadedById: input.uploadedById,
        version: nextVersion
      }
    });
  }

  async bootstrap() {
    const [departments, designations, managers, locations] = await Promise.all([
      prisma.department.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
      prisma.designation.findMany({ orderBy: { name: "asc" } }),
      prisma.employee.findMany({
        where: { deletedAt: null },
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
        orderBy: { firstName: "asc" },
        take: 200
      }),
      prisma.workLocation.findMany({ orderBy: { name: "asc" } })
    ]);
    return { departments, designations, managers, locations };
  }
}

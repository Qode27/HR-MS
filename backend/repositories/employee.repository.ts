import { prisma } from "@/lib/db";
import { DocumentType, SalaryType, UserStatus } from "@prisma/client";

export class EmployeeRepository {
  async list(input: {
    q: string;
    departmentId?: string;
    designationId?: string;
    managerId?: string;
    status?: UserStatus;
    tenantId?: string | null;
    skip: number;
    take: number;
  }) {
    const where = {
      deletedAt: null,
      departmentId: input.departmentId || undefined,
      designationId: input.designationId || undefined,
      managerId: input.managerId || undefined,
      status: input.status || undefined,
      tenantId: input.tenantId || undefined,
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

  async nextEmployeeCode(tenantId?: string | null) {
    const year = new Date().getFullYear();
    const count = await prisma.employee.count({ where: tenantId ? { tenantId } : {} });
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
    salaryType?: SalaryType;
    baseSalary?: number;
    hourlyRate?: number;
    allowances?: number;
    deductions?: number;
    skills?: string[];
    tenantId?: string | null;
  }) {
    const salaryType = data.salaryType || "FIXED";
    const salaryMonthly = data.salaryMonthly;
    return prisma.employee.create({
      data: {
        ...data,
        employeeCode: data.employeeCode || (await this.nextEmployeeCode(data.tenantId)),
        joiningDate: new Date(data.joiningDate),
        salaryType,
        salaryMonthly,
        baseSalary: salaryType === "FIXED" ? data.baseSalary ?? salaryMonthly : data.baseSalary ?? 0,
        hourlyRate: salaryType === "HOURLY" ? data.hourlyRate : null,
        allowances: salaryType === "FIXED" ? data.allowances ?? 0 : 0,
        deductions: salaryType === "FIXED" ? data.deductions ?? 0 : 0,
        skills: data.skills || []
      }
    });
  }

  async byId(id: string, tenantId?: string | null) {
    return prisma.employee.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
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
    tenantId?: string | null;
    type: DocumentType;
    fileName: string;
    filePath: string;
    uploadedById?: string;
  }) {
    const latest = await prisma.document.findFirst({
      where: { employeeId: input.employeeId, type: input.type, ...(input.tenantId ? { tenantId: input.tenantId } : {}) },
      orderBy: { version: "desc" }
    });
    const nextVersion = (latest?.version || 0) + 1;
    return prisma.document.create({
      data: {
        employeeId: input.employeeId,
        tenantId: input.tenantId,
        type: input.type,
        fileName: input.fileName,
        filePath: input.filePath,
        uploadedById: input.uploadedById,
        version: nextVersion
      }
    });
  }

  async bootstrap(tenantId?: string | null) {
    const tenantWhere = tenantId ? { tenantId } : {};
    const [departments, designations, managers, locations] = await Promise.all([
      prisma.department.findMany({ where: { deletedAt: null, ...tenantWhere }, orderBy: { name: "asc" } }),
      prisma.designation.findMany({ where: tenantWhere, orderBy: { name: "asc" } }),
      prisma.employee.findMany({
        where: { deletedAt: null, ...tenantWhere },
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
        orderBy: { firstName: "asc" },
        take: 200
      }),
      prisma.workLocation.findMany({ where: tenantWhere, orderBy: { name: "asc" } })
    ]);
    return { departments, designations, managers, locations };
  }
}

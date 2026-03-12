import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";

type Params = { params: { id: string } };

export const POST = withApiGuard(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "onboarding:manage");
  const payload = await req.json().catch(() => ({}));

  const candidate = await prisma.candidate.findUnique({ where: { id: params.id }, include: { jobOpening: { include: { requisition: true } } } });
  if (!candidate) throw new AppError("Candidate not found", 404);
  if (candidate.stage !== "JOINED") throw new AppError("Candidate must be in JOINED stage", 422);

  const designation =
    (payload?.designationId ? await prisma.designation.findUnique({ where: { id: String(payload.designationId) } }) : null) ||
    (await prisma.designation.findFirst());
  if (!designation) throw new AppError("Designation setup missing", 422);

  const employee = await prisma.employee.create({
    data: {
      employeeCode: `PF-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      firstName: candidate.fullName.split(" ")[0] || candidate.fullName,
      lastName: candidate.fullName.split(" ").slice(1).join(" ") || "-",
      personalEmail: candidate.email,
      phone: candidate.phone,
      joiningDate: payload?.joiningDate ? new Date(String(payload.joiningDate)) : new Date(),
      employmentType: candidate.jobOpening.requisition.employmentType,
      departmentId: payload?.departmentId ? String(payload.departmentId) : candidate.jobOpening.requisition.departmentId,
      designationId: designation.id,
      managerId: payload?.managerId ? String(payload.managerId) : undefined,
      workLocationId: payload?.workLocationId ? String(payload.workLocationId) : undefined,
      salaryMonthly: payload?.salaryMonthly ? Number(payload.salaryMonthly) : 50000,
      skills: candidate.skills,
      createdFromCandId: candidate.id
    }
  });

  await prisma.candidate.update({ where: { id: candidate.id }, data: { joinedEmployeeId: employee.id } });
  await prisma.onboardingTask.createMany({
    data: [
      { title: "Collect mandatory documents", employeeId: employee.id, candidateId: candidate.id, assigneeRole: "HR_ADMIN" },
      { title: "Provision IT assets", employeeId: employee.id, candidateId: candidate.id, assigneeRole: "SUPER_ADMIN" }
    ]
  });

  return success({ employeeId: employee.id, candidateId: candidate.id });
});

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError } from "@backend/utils/errors";

const clientStatus = z.enum(["ACTIVE", "TRIAL", "SUSPENDED", "INACTIVE"]);

const baseClientSchema = z.object({
  companyName: z.string().trim().min(2, "Company name is required").max(160),
  slug: z.string().trim().min(2).max(120).optional(),
  domain: z.string().trim().max(160).optional().nullable(),
  contactName: z.string().trim().min(2, "Contact name is required").max(120),
  contactEmail: z.string().trim().email("Valid contact email is required").max(160).transform((value) => value.toLowerCase()),
  contactPhone: z.string().trim().min(6, "Contact phone is required").max(32),
  subscriptionPlan: z.string().trim().min(2, "Subscription plan is required").max(80),
  status: clientStatus.default("ACTIVE"),
  employeeLimit: z.coerce.number().int().min(1).max(100000).optional(),
  monthlyPrice: z.coerce.number().min(0).optional(),
  password: z.string().min(8).optional()
});

const updateClientSchema = baseClientSchema.partial().extend({
  status: clientStatus.optional()
});

type ClientPayload = z.infer<typeof baseClientSchema>;
type ClientUpdatePayload = z.infer<typeof updateClientSchema>;

function parseClientPayload(payload: unknown): ClientPayload {
  const result = baseClientSchema.safeParse(payload);
  if (!result.success) throw new AppError("Invalid client data", 422, result.error.flatten());
  return result.data;
}

function parseClientUpdatePayload(payload: unknown): ClientUpdatePayload {
  const result = updateClientSchema.safeParse(payload);
  if (!result.success) throw new AppError("Invalid client data", 422, result.error.flatten());
  return result.data;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function generatePassword() {
  return `${crypto.randomUUID()}Aa1!`.slice(0, 24);
}

async function uniqueSlug(companyName: string, ignoreTenantId?: string, preferredSlug?: string) {
  const base = slugify(preferredSlug || companyName);
  let candidate = base || `client-${Date.now()}`;
  let index = 2;
  while (
    await prisma.tenant.findFirst({
      where: {
        slug: candidate,
        id: ignoreTenantId ? { not: ignoreTenantId } : undefined
      },
      select: { id: true }
    })
  ) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

function normalizeDomain(value?: string | null) {
  const domain = String(value || "").trim().toLowerCase();
  return domain || null;
}

function subscriptionStatusFor(status: string) {
  if (status === "ACTIVE") return "ACTIVE";
  if (status === "TRIAL") return "TRIAL";
  return "CANCELLED";
}

function toClientDto(tenant: any) {
  const subscription = tenant.subscriptions?.[0] || null;
  const planName = tenant.subscriptionPlan || subscription?.plan?.name || "Unassigned";
  const contactName = tenant.contactName || "";
  const contactEmail = tenant.contactEmail || subscription?.billingEmail || "";
  return {
    id: tenant.id,
    tenantId: tenant.id,
    companyName: tenant.name,
    slug: tenant.slug,
    domain: tenant.domain,
    contactName,
    contactEmail,
    contactPhone: tenant.contactPhone || "",
    subscriptionPlan: planName,
    status: tenant.status,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    employeeLimit: tenant.employeeLimit,
    employeeCap: tenant.employeeLimit,
    monthlyPrice: tenant.monthlyPrice || subscription?.mrr || 0,
    mrr: tenant.monthlyPrice || subscription?.mrr || 0,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          mrr: subscription.mrr,
          plan: subscription.plan
        }
      : null
  };
}

export class ClientService {
  async list(searchParams?: URLSearchParams) {
    const page = Math.max(1, Number(searchParams?.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams?.get("pageSize") || 20)));
    const q = String(searchParams?.get("q") || "").trim();
    const status = String(searchParams?.get("status") || "").trim();
    const where = {
      deletedAt: null,
      ...(status ? { status: status as any } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
              { contactName: { contains: q, mode: "insensitive" as const } },
              { contactEmail: { contains: q, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const [total, tenants] = await Promise.all([
      prisma.tenant.count({ where }),
      prisma.tenant.findMany({
      where,
      include: {
        subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
    ]);
    return { items: tenants.map(toClientDto), pagination: { page, pageSize, total } };
  }

  async detail(id: string) {
    const tenant = await prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    if (!tenant) throw new AppError("Client not found", 404);
    return toClientDto(tenant);
  }

  async create(payload: unknown) {
    const data = parseClientPayload(payload);
    const existingEmail = await prisma.user.findUnique({ where: { email: data.contactEmail }, select: { id: true } });
    if (existingEmail) throw new AppError("A user with this contact email already exists", 409);
    const existingDomain = data.domain
      ? await prisma.tenant.findFirst({ where: { domain: normalizeDomain(data.domain), deletedAt: null }, select: { id: true } })
      : null;
    if (existingDomain) throw new AppError("A client with this domain already exists", 409);

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const employeeLimit = data.employeeLimit || 250;
    const monthlyPrice = data.monthlyPrice ?? 49999;
    const temporaryPassword = data.password || generatePassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const slug = await uniqueSlug(data.companyName, undefined, data.slug);

    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.upsert({
        where: { name: data.subscriptionPlan },
        update: {},
        create: {
          name: data.subscriptionPlan,
          monthlyPrice,
          employeeLimit,
          features: { ats: true, payroll: true, documents: true, reports: true, timesheets: true }
        }
      });
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          slug,
          legalName: data.companyName,
          domain: normalizeDomain(data.domain),
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          subscriptionPlan: plan.name,
          status: data.status,
          employeeLimit,
          monthlyPrice
        }
      });
      await tx.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: subscriptionStatusFor(data.status),
          billingEmail: data.contactEmail,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          mrr: plan.monthlyPrice
        }
      });
      const role = await tx.role.upsert({
        where: { name: "SUPER_ADMIN" },
        update: {},
        create: { name: "SUPER_ADMIN", description: "Client owner" }
      });
      await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.contactEmail,
          fullName: data.contactName,
          passwordHash,
          roleId: role.id
        }
      });
      await tx.organizationSetting.create({
        data: {
          tenantId: tenant.id,
          key: `company.profile.${tenant.id}`,
          value: {
            name: data.companyName,
            domain: normalizeDomain(data.domain),
            contactName: data.contactName,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            timezone: "Asia/Calcutta",
            currency: "INR"
          }
        }
      });
      return tenant;
    });

    return {
      ...(await this.detail(result.id)),
      initialSuperAdmin: {
        email: data.contactEmail,
        temporaryPassword: data.password ? null : temporaryPassword
      }
    };
  }

  async update(id: string, payload: unknown) {
    const data = parseClientUpdatePayload(payload);
    const existing = await prisma.tenant.findFirst({ where: { id, deletedAt: null }, select: { id: true, name: true } });
    if (!existing) throw new AppError("Client not found", 404);
    if (data.contactEmail) {
      const user = await prisma.user.findFirst({ where: { email: data.contactEmail, tenantId: { not: id } }, select: { id: true } });
      if (user) throw new AppError("A user with this contact email already exists", 409);
    }
    if (data.domain) {
      const tenant = await prisma.tenant.findFirst({ where: { domain: normalizeDomain(data.domain), id: { not: id }, deletedAt: null }, select: { id: true } });
      if (tenant) throw new AppError("A client with this domain already exists", 409);
    }

    const slug = data.companyName ? await uniqueSlug(data.companyName, id) : undefined;
    await prisma.$transaction(async (tx) => {
      if (data.subscriptionPlan) {
        const plan = await tx.subscriptionPlan.upsert({
          where: { name: data.subscriptionPlan },
          update: {},
          create: {
            name: data.subscriptionPlan,
            monthlyPrice: data.monthlyPrice ?? 49999,
            employeeLimit: data.employeeLimit || 250,
            features: { ats: true, payroll: true, documents: true, reports: true, timesheets: true }
          }
        });
      }

      if (data.subscriptionPlan || data.contactEmail || data.status || data.monthlyPrice !== undefined) {
        const current = await tx.tenantSubscription.findFirst({ where: { tenantId: id }, orderBy: { createdAt: "desc" } });
        if (current) {
          const plan = data.subscriptionPlan ? await tx.subscriptionPlan.findUnique({ where: { name: data.subscriptionPlan } }) : null;
          await tx.tenantSubscription.update({
            where: { id: current.id },
            data: {
              planId: plan?.id,
              billingEmail: data.contactEmail || undefined,
              mrr: data.monthlyPrice,
              status: data.status ? subscriptionStatusFor(data.status) : undefined
            }
          });
        }
      }

      await tx.tenant.update({
        where: { id },
        data: {
          name: data.companyName,
          legalName: data.companyName,
          slug,
          domain: data.domain === undefined ? undefined : normalizeDomain(data.domain),
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          subscriptionPlan: data.subscriptionPlan,
          status: data.status,
          employeeLimit: data.employeeLimit,
          monthlyPrice: data.monthlyPrice
        }
      });

      if (data.contactName || data.contactEmail) {
        const superAdmin = await tx.user.findFirst({ where: { tenantId: id, deletedAt: null }, include: { role: true }, orderBy: { createdAt: "asc" } });
        if (superAdmin) {
          await tx.user.update({
            where: { id: superAdmin.id },
            data: {
              fullName: data.contactName || undefined,
              email: data.contactEmail || undefined
            }
          });
        }
      }
    });

    return this.detail(id);
  }

  async softDelete(id: string) {
    const existing = await prisma.tenant.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!existing) throw new AppError("Client not found", 404);
    await prisma.$transaction([
      prisma.tenant.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } }),
      prisma.tenantSubscription.updateMany({ where: { tenantId: id }, data: { status: "CANCELLED" } }),
      prisma.user.updateMany({ where: { tenantId: id }, data: { status: "INACTIVE" } })
    ]);
    return { id, deleted: true };
  }

  async updateStatus(id: string, status: unknown) {
    const parsed = clientStatus.safeParse(status);
    if (!parsed.success) throw new AppError("Invalid client status", 422, parsed.error.flatten());
    const existing = await prisma.tenant.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!existing) throw new AppError("Client not found", 404);
    await prisma.$transaction([
      prisma.tenant.update({ where: { id }, data: { status: parsed.data } }),
      prisma.tenantSubscription.updateMany({ where: { tenantId: id }, data: { status: subscriptionStatusFor(parsed.data) } }),
      prisma.user.updateMany({ where: { tenantId: id }, data: { status: parsed.data === "ACTIVE" || parsed.data === "TRIAL" ? "ACTIVE" : "INACTIVE" } })
    ]);
    return this.detail(id);
  }
}

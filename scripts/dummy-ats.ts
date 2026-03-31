import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { PrismaClient, CandidateSource, CandidateStage, EmploymentType, JobStatus } from "@prisma/client";

const prisma = new PrismaClient();

type OpeningRow = {
  requisitionTitle: string;
  jobTitle: string;
  description: string;
  department: string;
  employmentType: EmploymentType;
  location: string;
  openingsCount: number;
  recruiterEmail: string;
};

type CandidateRow = {
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  noticePeriodDays: number;
  totalExperience: number;
  skills: string;
  education: string;
  stage: CandidateStage;
  source: CandidateSource;
  rating: number;
  openingKey: string;
};

const openingSeeds: OpeningRow[] = [
  {
    requisitionTitle: "Frontend Engineer Hiring",
    jobTitle: "Frontend Engineer",
    description: "Build polished HRMS interfaces with modern React and Next.js.",
    department: "Engineering",
    employmentType: "FULL_TIME",
    location: "Bengaluru HQ",
    openingsCount: 3,
    recruiterEmail: "admin@peopleflow.local"
  },
  {
    requisitionTitle: "Backend Engineer Hiring",
    jobTitle: "Backend Engineer",
    description: "Develop secure APIs, reporting workflows and HR automation services.",
    department: "Engineering",
    employmentType: "FULL_TIME",
    location: "Bengaluru HQ",
    openingsCount: 2,
    recruiterEmail: "admin@peopleflow.local"
  },
  {
    requisitionTitle: "Recruiter Hiring",
    jobTitle: "Recruiter",
    description: "Manage sourcing, candidate pipelines and interview coordination.",
    department: "HR",
    employmentType: "FULL_TIME",
    location: "Mumbai",
    openingsCount: 2,
    recruiterEmail: "admin@peopleflow.local"
  },
  {
    requisitionTitle: "QA Analyst Hiring",
    jobTitle: "QA Analyst",
    description: "Own test coverage, quality gates and regression validation for HRMS.",
    department: "Operations",
    employmentType: "CONTRACT",
    location: "Delhi",
    openingsCount: 1,
    recruiterEmail: "admin@peopleflow.local"
  },
  {
    requisitionTitle: "Payroll Analyst Hiring",
    jobTitle: "Payroll Analyst",
    description: "Support payroll runs, validations and statutory output for monthly cycles.",
    department: "Finance",
    employmentType: "FULL_TIME",
    location: "Bengaluru HQ",
    openingsCount: 1,
    recruiterEmail: "admin@peopleflow.local"
  }
];

const candidateSeeds: CandidateRow[] = [
  { fullName: "Aarav Mehta", email: "aarav.mehta@example.com", phone: "9000001001", currentLocation: "Bengaluru", noticePeriodDays: 30, totalExperience: 4.2, skills: "React, Next.js, TypeScript", education: "B.Tech", stage: "SCREENING", source: "LINKEDIN", rating: 4, openingKey: "Frontend Engineer Hiring" },
  { fullName: "Diya Sharma", email: "diya.sharma@example.com", phone: "9000001002", currentLocation: "Mumbai", noticePeriodDays: 15, totalExperience: 3.5, skills: "React, CSS, UX", education: "BCA", stage: "SHORTLISTED", source: "REFERRAL", rating: 5, openingKey: "Frontend Engineer Hiring" },
  { fullName: "Kabir Singh", email: "kabir.singh@example.com", phone: "9000001003", currentLocation: "Delhi", noticePeriodDays: 45, totalExperience: 5.1, skills: "Next.js, GraphQL, Tailwind", education: "B.Tech", stage: "APPLIED", source: "CAREERS_PORTAL", rating: 3, openingKey: "Frontend Engineer Hiring" },
  { fullName: "Meera Joshi", email: "meera.joshi@example.com", phone: "9000001004", currentLocation: "Pune", noticePeriodDays: 60, totalExperience: 6, skills: "React, Testing Library, Jest", education: "MCA", stage: "INTERVIEW_SCHEDULED", source: "JOB_BOARD", rating: 4, openingKey: "Frontend Engineer Hiring" },
  { fullName: "Ishaan Reddy", email: "ishaan.reddy@example.com", phone: "9000001005", currentLocation: "Bengaluru", noticePeriodDays: 30, totalExperience: 6.3, skills: "Node.js, PostgreSQL, Prisma", education: "B.Tech", stage: "SCREENING", source: "DIRECT", rating: 4, openingKey: "Backend Engineer Hiring" },
  { fullName: "Anaya Khan", email: "anaya.khan@example.com", phone: "9000001006", currentLocation: "Hyderabad", noticePeriodDays: 45, totalExperience: 4.8, skills: "NestJS, APIs, Redis", education: "M.Tech", stage: "SHORTLISTED", source: "REFERRAL", rating: 5, openingKey: "Backend Engineer Hiring" },
  { fullName: "Rohan Patel", email: "rohan.patel@example.com", phone: "9000001007", currentLocation: "Ahmedabad", noticePeriodDays: 30, totalExperience: 7.2, skills: "TypeScript, SQL, System Design", education: "B.Tech", stage: "INTERVIEWED", source: "LINKEDIN", rating: 5, openingKey: "Backend Engineer Hiring" },
  { fullName: "Sana Nair", email: "sana.nair@example.com", phone: "9000001008", currentLocation: "Kochi", noticePeriodDays: 90, totalExperience: 2.8, skills: "Node.js, Express, REST", education: "BCA", stage: "OFFERED", source: "CAREERS_PORTAL", rating: 4, openingKey: "Backend Engineer Hiring" },
  { fullName: "Vivaan Gupta", email: "vivaan.gupta@example.com", phone: "9000001009", currentLocation: "Noida", noticePeriodDays: 30, totalExperience: 5.5, skills: "Recruiting, Candidate Sourcing, ATS", education: "MBA", stage: "SCREENING", source: "REFERRAL", rating: 4, openingKey: "Recruiter Hiring" },
  { fullName: "Aanya Verma", email: "aanya.verma@example.com", phone: "9000001010", currentLocation: "Mumbai", noticePeriodDays: 60, totalExperience: 4.1, skills: "Interviewing, Coordination, Hiring", education: "MBA", stage: "SHORTLISTED", source: "DIRECT", rating: 5, openingKey: "Recruiter Hiring" },
  { fullName: "Arjun Das", email: "arjun.das@example.com", phone: "9000001011", currentLocation: "Kolkata", noticePeriodDays: 30, totalExperience: 3.7, skills: "Sourcing, Screening, Excel", education: "B.Com", stage: "INTERVIEW_SCHEDULED", source: "JOB_BOARD", rating: 4, openingKey: "Recruiter Hiring" },
  { fullName: "Priya Iyer", email: "priya.iyer@example.com", phone: "9000001012", currentLocation: "Chennai", noticePeriodDays: 45, totalExperience: 5, skills: "People Ops, Recruitment, HRMS", education: "MBA", stage: "SELECTED", source: "CAREERS_PORTAL", rating: 5, openingKey: "Recruiter Hiring" },
  { fullName: "Karan Mehta", email: "karan.mehta@example.com", phone: "9000001013", currentLocation: "Pune", noticePeriodDays: 30, totalExperience: 4.6, skills: "Automation, Test Plans, Jira", education: "B.Tech", stage: "SCREENING", source: "LINKEDIN", rating: 4, openingKey: "QA Analyst Hiring" },
  { fullName: "Ira Sharma", email: "ira.sharma@example.com", phone: "9000001014", currentLocation: "Bengaluru", noticePeriodDays: 15, totalExperience: 3.2, skills: "Manual Testing, API Validation, SQL", education: "BCA", stage: "SHORTLISTED", source: "REFERRAL", rating: 4, openingKey: "QA Analyst Hiring" },
  { fullName: "Rahul Verma", email: "rahul.verma@example.com", phone: "9000001015", currentLocation: "Delhi", noticePeriodDays: 30, totalExperience: 6.4, skills: "Payroll, Compliance, Excel", education: "M.Com", stage: "APPLIED", source: "DIRECT", rating: 3, openingKey: "Payroll Analyst Hiring" },
  { fullName: "Nisha Reddy", email: "nisha.reddy@example.com", phone: "9000001016", currentLocation: "Hyderabad", noticePeriodDays: 45, totalExperience: 5.6, skills: "Payroll Operations, Statutory Filings", education: "MBA", stage: "INTERVIEWED", source: "JOB_BOARD", rating: 5, openingKey: "Payroll Analyst Hiring" },
  { fullName: "Dev Joshi", email: "dev.joshi@example.com", phone: "9000001017", currentLocation: "Jaipur", noticePeriodDays: 60, totalExperience: 2.9, skills: "Salary Processing, Excel", education: "B.Com", stage: "ON_HOLD", source: "CAREERS_PORTAL", rating: 3, openingKey: "Payroll Analyst Hiring" },
  { fullName: "Riya Khan", email: "riya.khan@example.com", phone: "9000001018", currentLocation: "Mumbai", noticePeriodDays: 30, totalExperience: 4.3, skills: "Compliance, HRIS, Payroll", education: "M.Com", stage: "REJECTED", source: "LINKEDIN", rating: 2, openingKey: "Payroll Analyst Hiring" },
  { fullName: "Om Patel", email: "om.patel@example.com", phone: "9000001019", currentLocation: "Surat", noticePeriodDays: 15, totalExperience: 3.8, skills: "React, APIs, Product Sense", education: "B.Tech", stage: "APPLIED", source: "REFERRAL", rating: 4, openingKey: "Frontend Engineer Hiring" },
  { fullName: "Pooja Singh", email: "pooja.singh@example.com", phone: "9000001020", currentLocation: "Bengaluru", noticePeriodDays: 30, totalExperience: 7.1, skills: "Node.js, Prisma, PostgreSQL", education: "B.Tech", stage: "JOINED", source: "DIRECT", rating: 5, openingKey: "Backend Engineer Hiring" }
];

function buildWorkbook() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(openingSeeds), "Openings");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(candidateSeeds), "Candidates");
  return workbook;
}

async function ensureWorkbookFile() {
  const outputDir = path.resolve(process.cwd(), "data");
  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, "dummy-ats-candidates.xlsx");
  XLSX.writeFile(buildWorkbook(), filePath);
  return filePath;
}

async function main() {
  const filePath = await ensureWorkbookFile();

  const [departments, designations, workLocations, existingUsers] = await Promise.all([
    prisma.department.findMany({ where: { deletedAt: null } }),
    prisma.designation.findMany(),
    prisma.workLocation.findMany(),
    prisma.user.findMany({
      where: { email: { in: openingSeeds.map((row) => row.recruiterEmail) } },
      select: { id: true, email: true }
    })
  ]);

  if (departments.length === 0 || designations.length === 0 || workLocations.length === 0) {
    throw new Error("ATS seed needs departments, designations, and work locations. Seed employees first.");
  }

  const departmentByName = new Map(departments.map((row) => [row.name, row]));
  const locationByName = new Map(workLocations.map((row) => [row.name, row]));
  const recruiterByEmail = new Map(existingUsers.map((row) => [row.email, row.id]));
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@peopleflow.local" }, select: { id: true } });
  if (!adminUser) throw new Error("Admin user missing. Seed users first.");

  const openingByTitle = new Map<string, string>();

  for (const opening of openingSeeds) {
    const department = departmentByName.get(opening.department) ?? departments[0];
    const location = locationByName.get(opening.location) ?? workLocations[0];
    const recruiterId = recruiterByEmail.get(opening.recruiterEmail);

    const requisition =
      (await prisma.jobRequisition.findFirst({ where: { title: opening.requisitionTitle } })) ||
      (await prisma.jobRequisition.create({
        data: {
          title: opening.requisitionTitle,
          departmentId: department.id,
          employmentType: opening.employmentType,
          location: opening.location,
          status: "APPROVED" as JobStatus,
          notes: "Seeded ATS requisition"
        }
      }));

    if (requisition.status !== "APPROVED" || requisition.departmentId !== department.id || requisition.employmentType !== opening.employmentType || requisition.location !== opening.location) {
      await prisma.jobRequisition.update({
        where: { id: requisition.id },
        data: {
          departmentId: department.id,
          employmentType: opening.employmentType,
          location: opening.location,
          status: "APPROVED" as JobStatus,
          notes: "Seeded ATS requisition"
        }
      });
    }

    const jobOpening = await prisma.jobOpening.upsert({
      where: { requisitionId: requisition.id },
      update: {
        title: opening.jobTitle,
        description: opening.description,
        locationId: location.id,
        recruiterId,
        openingsCount: opening.openingsCount,
        status: "OPEN" as JobStatus,
        publishedAt: new Date()
      },
      create: {
        requisitionId: requisition.id,
        title: opening.jobTitle,
        description: opening.description,
        locationId: location.id,
        recruiterId,
        openingsCount: opening.openingsCount,
        status: "OPEN" as JobStatus,
        publishedAt: new Date()
      }
    });

    openingByTitle.set(opening.requisitionTitle, jobOpening.id);
  }

  let created = 0;
  let updated = 0;

  for (const candidate of candidateSeeds) {
    const jobOpeningId = openingByTitle.get(candidate.openingKey);
    if (!jobOpeningId) throw new Error(`Missing job opening for candidate seed: ${candidate.openingKey}`);

    const duplicateHash = `${candidate.email}:${candidate.phone}`;
    const parsedResume = {
      name: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone,
      skills: candidate.skills.split(",").map((item) => item.trim()),
      experience: candidate.totalExperience,
      education: candidate.education
    };

    const record = await prisma.candidate.upsert({
      where: {
        jobOpeningId_email: {
          jobOpeningId,
          email: candidate.email
        }
      },
      update: {
        fullName: candidate.fullName,
        phone: candidate.phone,
        currentLocation: candidate.currentLocation,
        noticePeriodDays: candidate.noticePeriodDays,
        totalExperience: candidate.totalExperience,
        skills: candidate.skills.split(",").map((item) => item.trim()),
        education: candidate.education,
        stage: candidate.stage,
        source: candidate.source,
        rating: candidate.rating,
        duplicateHash,
        parsedResume,
        activity: {
          deleteMany: {},
          create: [
            { action: "Candidate imported", meta: { source: "excel-import", stage: candidate.stage } },
            { action: "Profile screened", meta: { score: candidate.rating } }
          ]
        },
        comments: {
          deleteMany: {},
          create: [
            { authorId: adminUser.id, comment: "Imported from ATS demo workbook." }
          ]
        }
      },
      create: {
        jobOpeningId,
        fullName: candidate.fullName,
        email: candidate.email,
        phone: candidate.phone,
        currentLocation: candidate.currentLocation,
        noticePeriodDays: candidate.noticePeriodDays,
        totalExperience: candidate.totalExperience,
        skills: candidate.skills.split(",").map((item) => item.trim()),
        education: candidate.education,
        stage: candidate.stage,
        source: candidate.source,
        rating: candidate.rating,
        duplicateHash,
        parsedResume,
        activity: {
          create: [
            { action: "Candidate imported", meta: { source: "excel-import", stage: candidate.stage } },
            { action: "Profile screened", meta: { score: candidate.rating } }
          ]
        }
      },
      include: {
        activity: true
      }
    });

    if (record.createdAt.getTime() === record.updatedAt.getTime()) created += 1;
    else updated += 1;
  }

  console.log(`Wrote workbook: ${filePath}`);
  console.log(`Imported ${candidateSeeds.length} ATS candidates (${created} created, ${updated} updated).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

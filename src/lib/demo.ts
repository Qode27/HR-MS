"use client";

import { useEffect, useState } from "react";

const DEMO_COOKIE = "hrms_demo";
const DEMO_STATE_KEY = "hrms_demo_state_v1";

let originalFetch: typeof window.fetch | null = null;
let bootstrapped = false;
let stateCache: any = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function readCookie(name: string) {
  if (!isBrowser()) return false;
  return document.cookie.split("; ").some((item) => item.startsWith(`${name}=`) && item.split("=")[1] === "true");
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=86400; samesite=lax`;
}

function delay(min = 300, max = 700) {
  const ms = min + Math.floor(Math.random() * (max - min + 1));
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function responseJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function success<T>(data: T, status = 200) {
  return responseJson({ success: true, data }, status);
}

function failure(message: string, status = 400, details?: unknown) {
  return responseJson({ success: false, error: { message, details } }, status);
}

export function isDemoRequested() {
  if (!isBrowser()) return false;
  return new URLSearchParams(window.location.search).get("demo") === "true";
}

export function isDemoMode() {
  if (!isBrowser()) return false;
  return isDemoRequested() || readCookie(DEMO_COOKIE) || localStorage.getItem(DEMO_STATE_KEY) !== null;
}

export function useDemoMode() {
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(isDemoMode()), []);
  return demo;
}

async function loadModules() {
  const [employeesMod, attendanceMod, leavesMod, payrollMod] = await Promise.all([
    import("@/demo/mockData/employees"),
    import("@/demo/mockData/attendance"),
    import("@/demo/mockData/leaves"),
    import("@/demo/mockData/payroll")
  ]);
  return { employeesMod, attendanceMod, leavesMod, payrollMod };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function buildCandidates(jobOpenings: Array<Record<string, any>>) {
  const stageCycle = ["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "OFFERED", "JOINED"] as const;
  const sourceCycle = ["CAREERS_PORTAL", "REFERRAL", "LINKEDIN", "JOB_BOARD", "DIRECT", "AGENCY"] as const;
  const names = [
    ["Aarav", "Mehta"],
    ["Diya", "Sharma"],
    ["Kabir", "Singh"],
    ["Meera", "Joshi"],
    ["Ishaan", "Reddy"],
    ["Anaya", "Khan"],
    ["Rohan", "Patel"],
    ["Sana", "Nair"],
    ["Vivaan", "Gupta"],
    ["Aanya", "Verma"]
  ];
  return names.map((name, index) => {
    const opening = jobOpenings[index % jobOpenings.length];
    return {
      id: `cand-demo-${index + 1}`,
      jobOpeningId: opening.id,
      fullName: `${name[0]} ${name[1]}`,
      email: `${name[0].toLowerCase()}.${name[1].toLowerCase()}@demo.qode27.com`,
      phone: `90000${String(2000 + index).slice(-5)}`,
      currentLocation: index % 2 === 0 ? "Bengaluru" : "Mumbai",
      noticePeriodDays: 30 + (index % 3) * 15,
      totalExperience: 2.5 + index * 0.7,
      skills: opening.title.includes("Frontend") ? ["React", "Next.js", "TypeScript"] : opening.title.includes("Backend") ? ["Node.js", "Prisma", "PostgreSQL"] : ["Recruiting", "Communication", "Excel"],
      education: index % 2 === 0 ? "B.Tech" : "MBA",
      stage: stageCycle[index % stageCycle.length],
      source: sourceCycle[index % sourceCycle.length],
      rating: 3 + (index % 3),
      comments: [],
      activity: [{ id: `act-${index + 1}`, action: "Imported into demo ATS" }],
      interviews: [],
      offer: null,
      onboardingTasks: [],
      parsedResume: { name: `${name[0]} ${name[1]}`, email: `${name[0].toLowerCase()}.${name[1].toLowerCase()}@demo.qode27.com`, skills: ["Demo", "ATS"], experience: 2.5 + index * 0.7, education: index % 2 === 0 ? "B.Tech" : "MBA" }
    };
  });
}

async function buildInitialState() {
  const { employeesMod, attendanceMod, leavesMod, payrollMod } = await loadModules();
  const { employees, departments, designations, workLocations } = employeesMod as any;
  const attendanceRecords = clone((attendanceMod as any).attendanceRecords);
  const leaveTypes = clone((leavesMod as any).leaveTypes);
  const leaveBalances = clone((leavesMod as any).leaveBalances);
  const leaveRequests = clone((leavesMod as any).leaveRequests);
  const payrollRuns = clone((payrollMod as any).payrollRuns);
  const payrollItems = clone((payrollMod as any).payrollItems);
  const payslips = clone((payrollMod as any).payslips);
  const performanceCycles = [
    { id: "cycle-demo-q1", name: "Q1 2026", startDate: "2026-01-01", endDate: "2026-03-31", status: "COMPLETED" },
    { id: "cycle-demo-q2", name: "Q2 2026", startDate: "2026-04-01", endDate: "2026-06-30", status: "DRAFT" }
  ];

  const employeeRows: any[] = employees.map((employee: any, index: number) => ({
    id: employee.employeeCode,
    employeeCode: employee.employeeCode,
    userId: employee.userId || null,
    firstName: employee.firstName,
    lastName: employee.lastName,
    personalEmail: employee.personalEmail,
    phone: employee.phone,
    dateOfBirth: employee.dateOfBirth || null,
    joiningDate: employee.joiningDate,
    employmentType: employee.employmentType,
    status: employee.status,
    departmentId: departments.find((department: any) => department.name === employee.department)?.id || departments[0].id,
    designationId: designations.find((designation: any) => designation.name === employee.designation)?.id || designations[0].id,
    managerCode: employee.managerCode || "",
    workLocationId: workLocations.find((location: any) => location.name === employee.workLocation)?.id || workLocations[0].id,
    emergencyContact: index % 3 === 0 ? { name: `${employee.firstName} Contact`, phone: `98${String(index).padStart(8, "0")}` } : null,
    bankDetails: index % 4 === 0 ? { account: `ACCT${index + 1000}`, bank: "Demo Bank" } : null,
    salaryMonthly: employee.salaryMonthly,
    noticePeriodDays: 30,
    skills: employee.skills,
    department: departments.find((department: any) => department.name === employee.department) || departments[0],
    designation: designations.find((designation: any) => designation.name === employee.designation) || designations[0],
    manager: null,
    workLocation: workLocations.find((location: any) => location.name === employee.workLocation) || workLocations[0],
    attendanceRecords: [],
    leaveRequests: [],
    leaveBalances: [],
    payrollItems: [],
    payslips: [],
    documents: [],
    timelineEvents: [{ id: `${employee.employeeCode}-timeline-1`, title: "Profile created", description: "Imported into demo mode" }],
    performanceReviews: [{ id: `${employee.employeeCode}-perf-1`, cycleId: "cycle-demo-q1", selfRating: 4, managerRating: 4 }]
  }));

  const employeeByCode = new Map(employeeRows.map((employee) => [employee.employeeCode, employee]));
  employeeRows.forEach((employee) => {
    if (employee.managerCode && employeeByCode.get(employee.managerCode)) {
      const manager = employeeByCode.get(employee.managerCode) as any;
      employee.manager = { id: manager.id, firstName: manager.firstName, lastName: manager.lastName, employeeCode: employee.managerCode };
    }
  });

  const payrollByRun = new Map<string, any[]>();
  payrollItems.forEach((item: any) => payrollByRun.set(item.payrollRunId, [...(payrollByRun.get(item.payrollRunId) || []), item]));

  const currentUser = { sub: "demo-user", role: "Admin", email: "hr.manager@qode27.com", name: "HR Manager", typ: "access", iat: nowUnix(), exp: nowUnix() + 60 * 60 };
  const jobOpenings: any[] = [
    { id: "job-demo-1", requisitionId: "req-demo-1", title: "Frontend Engineer", description: "Build polished HRMS experiences in React and Next.js.", locationId: workLocations[0].id, status: "OPEN", recruiterId: currentUser.sub, openingsCount: 3, publishedAt: new Date("2026-03-20T00:00:00Z").toISOString(), closeDate: null, requisition: { id: "req-demo-1", title: "Frontend Engineer Hiring", departmentId: departments.find((d: any) => d.name === "Engineering")?.id || departments[0].id, location: "Bengaluru HQ", employmentType: "FULL_TIME", status: "APPROVED" }, recruiter: { id: currentUser.sub, email: currentUser.email, fullName: currentUser.name, roleId: "demo-role" }, candidates: [] as any[], interviews: [] as any[], offers: [] as any[] },
    { id: "job-demo-2", requisitionId: "req-demo-2", title: "Backend Engineer", description: "Develop secure APIs, payroll services and workflows.", locationId: workLocations[0].id, status: "OPEN", recruiterId: currentUser.sub, openingsCount: 2, publishedAt: new Date("2026-03-22T00:00:00Z").toISOString(), closeDate: null, requisition: { id: "req-demo-2", title: "Backend Engineer Hiring", departmentId: departments.find((d: any) => d.name === "Engineering")?.id || departments[0].id, location: "Bengaluru HQ", employmentType: "FULL_TIME", status: "APPROVED" }, recruiter: { id: currentUser.sub, email: currentUser.email, fullName: currentUser.name, roleId: "demo-role" }, candidates: [] as any[], interviews: [] as any[], offers: [] as any[] },
    { id: "job-demo-3", requisitionId: "req-demo-3", title: "Recruiter", description: "Manage sourcing, screening and candidate coordination.", locationId: workLocations[1].id, status: "OPEN", recruiterId: currentUser.sub, openingsCount: 2, publishedAt: new Date("2026-03-25T00:00:00Z").toISOString(), closeDate: null, requisition: { id: "req-demo-3", title: "Recruiter Hiring", departmentId: departments.find((d: any) => d.name === "HR")?.id || departments[0].id, location: "Mumbai", employmentType: "FULL_TIME", status: "APPROVED" }, recruiter: { id: currentUser.sub, email: currentUser.email, fullName: currentUser.name, roleId: "demo-role" }, candidates: [] as any[], interviews: [] as any[], offers: [] as any[] }
  ];

  const candidates = buildCandidates(jobOpenings);
  candidates.forEach((candidate) => {
    const jobOpening = jobOpenings.find((opening) => opening.id === candidate.jobOpeningId);
    if (jobOpening) jobOpening.candidates.push(candidate);
  });

  const announcements = [{ id: "ann-demo-1", title: "Quarterly review window open" }, { id: "ann-demo-2", title: "Payroll preview ready for March" }];
  const documents = employeeRows.slice(0, 6).map((employee: any, index: number) => ({
    id: `doc-demo-${index + 1}`,
    type: index % 2 === 0 ? "ID_PROOF" : "OFFER_LETTER",
    fileName: `${employee.employeeCode}-${index % 2 === 0 ? "aadhar" : "offer"}.pdf`,
    filePath: `/demo/documents/${employee.employeeCode}-${index + 1}.pdf`,
    version: 1,
    employeeId: employee.id,
    candidateId: null
  }));
  const onboardingTasks = candidates.slice(0, 4).map((candidate: any, index: number) => ({
    id: `ob-demo-${index + 1}`,
    title: index % 2 === 0 ? "Collect KYC documents" : "Laptop allocation",
    status: index === 0 ? "DONE" : index === 1 ? "IN_PROGRESS" : "TODO",
    employee: index === 0 ? employeeRows[0] : null,
    candidate
  }));
  const performanceReviews = [
    { id: "rev-demo-1", employeeId: employeeRows[1].id, employee: employeeRows[1], selfRating: 4, managerRating: 4, notes: "Strong collaboration and delivery." },
    { id: "rev-demo-2", employeeId: employeeRows[2].id, employee: employeeRows[2], selfRating: 5, managerRating: 4, notes: "Excellent ownership on APIs." }
  ];
  const performanceGoals = [
    { id: "goal-demo-1", employeeId: employeeRows[1].id, cycleId: "cycle-demo-q2", title: "Reduce frontend bundle size", description: "Improve user experience", targetValue: 15, weight: 20 },
    { id: "goal-demo-2", employeeId: employeeRows[2].id, cycleId: "cycle-demo-q2", title: "Ship payroll audit trail", description: "Add traceability", targetValue: 1, weight: 30 }
  ];
  const regularizations = [
    { id: "reg-demo-1", date: "2026-04-01", employee: employeeRows[1], regularization: { status: "PENDING", reason: "Missed swipe at entry" } },
    { id: "reg-demo-2", date: "2026-03-31", employee: employeeRows[3], regularization: { status: "APPROVED", reason: "Client visit correction" } }
  ];
  const interviews = candidates.slice(0, 4).map((candidate: any, index: number) => ({
    id: `iv-demo-${index + 1}`,
    candidate,
    jobOpening: jobOpenings.find((job) => job.id === candidate.jobOpeningId),
    scheduledAt: new Date(`2026-04-${String(index + 2).padStart(2, "0")}T10:00:00Z`).toISOString(),
    mode: index % 2 === 0 ? "VIDEO" : "IN_PERSON",
    panelists: ["HR Manager", "Engineering Lead"].slice(0, 1 + (index % 2))
  }));
  const dashboard = {
    stats: {
      employees: employeeRows.length,
      pendingLeaves: leaveRequests.filter((request: any) => request.status === "PENDING").length,
      openPositions: jobOpenings.length
    }
  };
  return {
    currentUser,
    employees: employeeRows,
    departments,
    designations,
    workLocations,
    attendanceRecords,
    leaveTypes,
    leaveBalances,
    leaveRequests,
    payrollRuns: payrollRuns.map((run: any) => ({ ...run, _count: { items: payrollByRun.get(run.id)?.length || 0 }, summaryJson: run.summaryJson })),
    payrollItems,
    payslips,
    performanceCycles,
    performanceReviews,
    performanceGoals,
    candidates,
    jobOpenings,
    interviews,
    announcements,
    documents,
    regularizations,
    onboardingTasks,
    dashboard,
    settings: { companyName: "PeopleFlow HR", timezone: "Asia/Calcutta", currency: "INR" },
    recruitmentStages: [
      { stage: "APPLIED", order: 1, label: "Applied" },
      { stage: "SCREENING", order: 2, label: "Screening" },
      { stage: "SHORTLISTED", order: 3, label: "Shortlisted" },
      { stage: "INTERVIEW_SCHEDULED", order: 4, label: "Interview" },
      { stage: "INTERVIEWED", order: 5, label: "Technical" },
      { stage: "SELECTED", order: 6, label: "HR Round" },
      { stage: "OFFERED", order: 7, label: "Offer" },
      { stage: "JOINED", order: 8, label: "Hired" },
      { stage: "REJECTED", order: 9, label: "Rejected" },
      { stage: "ON_HOLD", order: 10, label: "On Hold" }
    ]
  };
}

async function getState(): Promise<any> {
  if (!isBrowser()) throw new Error("Demo state only works in the browser");
  if (stateCache) return stateCache;
  const saved = localStorage.getItem(DEMO_STATE_KEY);
  if (saved) {
    try {
      stateCache = JSON.parse(saved);
      return stateCache;
    } catch {
      localStorage.removeItem(DEMO_STATE_KEY);
    }
  }
  stateCache = await buildInitialState();
  localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(stateCache));
  return stateCache;
}

function persistState(state: any) {
  stateCache = state;
  localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(stateCache));
}

function parseBody(init?: RequestInit) {
  if (!init?.body || typeof init.body !== "string") return null;
  try {
    return JSON.parse(init.body);
  } catch {
    return null;
  }
}

function findEmployee(state: any, id: string) {
  return state.employees.find((employee: any) => employee.id === id || employee.employeeCode === id);
}

function employeeDetail(state: any, employee: any) {
  return {
    ...employee,
    attendanceRecords: state.attendanceRecords.filter((record: any) => record.employeeCode === employee.employeeCode),
    leaveRequests: state.leaveRequests.filter((request: any) => request.employeeCode === employee.employeeCode),
    leaveBalances: state.leaveBalances.filter((balance: any) => balance.employeeCode === employee.employeeCode).map((balance: any) => ({ ...balance, leaveType: state.leaveTypes.find((leaveType: any) => leaveType.code === balance.leaveTypeCode) })),
    payslips: state.payslips.filter((slip: any) => slip.employeeCode === employee.employeeCode),
    payrollItems: state.payrollItems.filter((item: any) => item.employeeCode === employee.employeeCode),
    performanceReviews: employee.performanceReviews,
    timelineEvents: employee.timelineEvents,
    documents: employee.documents
  };
}

function filterEmployees(state: any, query: URLSearchParams) {
  const q = (query.get("q") || "").toLowerCase();
  const departmentId = query.get("departmentId") || "";
  const designationId = query.get("designationId") || "";
  const managerId = query.get("managerId") || "";
  const status = query.get("status") || "";
  const page = Math.max(1, Number(query.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(query.get("pageSize") || "10")));
  let rows = [...state.employees];
  if (q) rows = rows.filter((employee: any) => `${employee.firstName} ${employee.lastName} ${employee.employeeCode}`.toLowerCase().includes(q));
  if (departmentId) rows = rows.filter((employee: any) => employee.departmentId === departmentId);
  if (designationId) rows = rows.filter((employee: any) => employee.designationId === designationId);
  if (managerId) rows = rows.filter((employee: any) => employee.manager?.id === managerId);
  if (status) rows = rows.filter((employee: any) => employee.status === status);
  const total = rows.length;
  return { items: rows.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize };
}

function filterAttendance(state: any, query: URLSearchParams) {
  const page = Math.max(1, Number(query.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(query.get("pageSize") || "20")));
  const month = query.get("month") ? Number(query.get("month")) : undefined;
  const year = query.get("year") ? Number(query.get("year")) : undefined;
  const q = (query.get("q") || "").toLowerCase();
  const status = query.get("status") || "";
  let rows = [...state.attendanceRecords];
  if (month || year) rows = rows.filter((record: any) => {
    const d = new Date(record.date);
    return (!month || d.getMonth() + 1 === month) && (!year || d.getFullYear() === year);
  });
  if (q) rows = rows.filter((record: any) => record.employeeName.toLowerCase().includes(q));
  if (status) rows = rows.filter((record: any) => record.status === status);
  const total = rows.length;
  const items = rows.slice((page - 1) * pageSize, page * pageSize).map((record: any) => ({
    ...record,
    employee: { firstName: record.employeeName.split(" ")[0], lastName: record.employeeName.split(" ").slice(1).join(" ") }
  }));
  const summary = {
    present: rows.filter((record: any) => record.status === "PRESENT").length,
    absent: rows.filter((record: any) => record.status === "ABSENT").length,
    halfDay: rows.filter((record: any) => record.status === "HALF_DAY").length,
    onLeave: rows.filter((record: any) => record.status === "ON_LEAVE").length,
    holiday: rows.filter((record: any) => record.status === "HOLIDAY").length,
    weekOff: rows.filter((record: any) => record.status === "WEEK_OFF").length,
    averageWorkMinutes: Math.round(rows.reduce((sum: number, record: any) => sum + Number(record.workMinutes || 0), 0) / Math.max(1, rows.length))
  };
  return { page, pageSize, total, summary, items };
}

function leavePayload(state: any) {
  const employee = state.employees[0];
  return {
    leaveTypes: state.leaveTypes,
    balances: state.leaveBalances.filter((balance: any) => balance.employeeCode === employee.employeeCode).map((balance: any) => ({ ...balance, leaveType: state.leaveTypes.find((leaveType: any) => leaveType.code === balance.leaveTypeCode) })),
    requests: state.leaveRequests.filter((request: any) => request.employeeCode === employee.employeeCode).map((request: any) => ({ ...request, leaveType: state.leaveTypes.find((leaveType: any) => leaveType.code === request.leaveTypeCode) })),
    approvalQueue: state.leaveRequests.filter((request: any) => request.status === "PENDING").map((request: any) => ({
      ...request,
      employee: employeeDetail(state, findEmployee(state, request.employeeCode)),
      leaveType: state.leaveTypes.find((leaveType: any) => leaveType.code === request.leaveTypeCode)
    }))
  };
}

function payrollPayload(state: any) {
  return state.payrollRuns.map((run: any) => ({
    ...run,
    items: state.payrollItems.filter((item: any) => item.payrollRunId === run.id).length,
    _count: { items: state.payrollItems.filter((item: any) => item.payrollRunId === run.id).length },
    summaryJson: run.summaryJson
  }));
}

function dashboardPayload(state: any) {
  return {
    stats: state.dashboard.stats,
    candidatesByStage: state.recruitmentStages.map((stage: any) => ({ stage: stage.stage, _count: state.candidates.filter((candidate: any) => candidate.stage === stage.stage).length })),
    announcements: state.announcements
  };
}

function atsCandidatesPayload(state: any, query: URLSearchParams) {
  const q = (query.get("q") || "").toLowerCase();
  return state.candidates.filter((candidate: any) => !q || `${candidate.fullName} ${candidate.email} ${(candidate.skills || []).join(" ")}`.toLowerCase().includes(q)).map((candidate: any) => ({
    ...candidate,
    jobOpening: state.jobOpenings.find((opening: any) => opening.id === candidate.jobOpeningId),
    comments: candidate.comments || []
  }));
}

async function handleDemoRequest(url: string | URL, init?: RequestInit) {
  const state = await getState();
  const requestUrl = new URL(typeof url === "string" ? url : url.toString(), window.location.origin);
  const pathname = requestUrl.pathname;
  const method = (init?.method || "GET").toUpperCase();
  const body = parseBody(init);
  await delay(method === "GET" ? 300 : 450, 700);

  if (pathname === "/api/auth/me") return success(state.currentUser);
  if (pathname === "/api/auth/login") return success({ user: { id: state.currentUser.sub, email: state.currentUser.email, name: state.currentUser.name, role: state.currentUser.role } });
  if (pathname === "/api/auth/logout") return success({ loggedOut: true });
  if (pathname === "/api/auth/refresh") return success({ refreshed: true });
  if (pathname === "/api/auth/forgot-password" || pathname === "/api/auth/reset-password") return success({ message: "Demo mode: password reset is disabled." });

  if (pathname === "/api/dashboard/summary") return success(dashboardPayload(state));
  if (pathname === "/api/employees/bootstrap") {
    const managers = state.employees.filter((employee: any) => ["HR Manager", "Sales Manager", "QA Lead", "Marketing Manager", "Support Lead"].includes(employee.designation?.name || employee.designation)).map((employee: any) => ({ id: employee.id, firstName: employee.firstName, lastName: employee.lastName, employeeCode: employee.employeeCode }));
    return success({ departments: state.departments, designations: state.designations, managers, locations: state.workLocations });
  }
  if (pathname === "/api/departments" && method === "POST") {
    const department = { id: `dept-demo-${Date.now()}`, name: body.name, code: body.code || body.name?.slice(0, 3).toUpperCase() };
    state.departments.unshift(department);
    persistState(state);
    return success(department, 201);
  }
  if (pathname === "/api/designations" && method === "POST") {
    const designation = { id: `desg-demo-${Date.now()}`, name: body.name };
    state.designations.unshift(designation);
    persistState(state);
    return success(designation, 201);
  }
  if (pathname === "/api/employees" && method === "GET") return success(filterEmployees(state, requestUrl.searchParams));
  if (pathname === "/api/employees" && method === "POST") {
    const nextCode = `PF-${new Date().getFullYear()}-${String(state.employees.length + 1).padStart(5, "0")}`;
    const department = state.departments.find((item: any) => item.id === body.departmentId) || state.departments[0];
    const designation = state.designations.find((item: any) => item.id === body.designationId) || state.designations[0];
    const location = state.workLocations.find((item: any) => item.id === body.workLocationId) || state.workLocations[0];
    const employee = {
      id: `emp-demo-${state.employees.length + 1}`,
      employeeCode: nextCode,
      userId: null,
      firstName: body.firstName,
      lastName: body.lastName,
      personalEmail: body.personalEmail || null,
      phone: body.phone || null,
      dateOfBirth: null,
      joiningDate: body.joiningDate,
      employmentType: body.employmentType,
      status: "ACTIVE",
      departmentId: department.id,
      designationId: designation.id,
      managerId: body.managerId || null,
      workLocationId: location.id,
      emergencyContact: body.emergencyContact || null,
      bankDetails: null,
      salaryMonthly: body.salaryMonthly,
      noticePeriodDays: 30,
      skills: body.skills || [],
      department,
      designation,
      manager: body.managerId ? state.employees.find((item: any) => item.id === body.managerId) || null : null,
      workLocation: location,
      attendanceRecords: [],
      leaveRequests: [],
      leaveBalances: [],
      payrollItems: [],
      payslips: [],
      documents: [],
      timelineEvents: [{ id: `${nextCode}-timeline`, title: "Profile created", description: "Added in demo mode" }],
      performanceReviews: [],
      performanceGoals: []
    };
    state.employees.unshift(employee);
    persistState(state);
    return success(employee, 201);
  }
  if (pathname.startsWith("/api/employees/") && method === "GET") {
    const id = pathname.split("/")[3];
    const employee = findEmployee(state, id);
    if (!employee) return failure("Employee not found", 404);
    return success(employeeDetail(state, employee));
  }

  if (pathname === "/api/attendance" && method === "GET") return success(filterAttendance(state, requestUrl.searchParams));
  if (pathname === "/api/attendance" && method === "POST") {
    const employee = state.employees[0];
    const today = new Date().toISOString().slice(0, 10);
    const existing = state.attendanceRecords.find((record: any) => record.employeeCode === employee.employeeCode && record.date === today);
    if (existing) {
      existing.checkOut = `${today}T18:02:00Z`;
      existing.status = "PRESENT";
      existing.workMinutes = 482;
    } else {
      state.attendanceRecords.unshift({ id: `att-demo-${Date.now()}`, employeeCode: employee.employeeCode, employeeName: `${employee.firstName} ${employee.lastName}`, date: today, checkIn: `${today}T09:12:00Z`, checkOut: null, status: "PRESENT", workMinutes: 260 });
    }
    persistState(state);
    return success({ message: "Attendance updated in demo mode" });
  }
  if (pathname === "/api/attendance/regularization" && method === "GET") {
    if (requestUrl.searchParams.get("pending") === "1") return success(state.regularizations.filter((item: any) => item.regularization.status === "PENDING"));
    return success(state.regularizations.filter((item: any) => item.employee?.id === state.currentUser.sub || item.employee?.userId === state.currentUser.sub || item.employee?.id === state.employees[0].id));
  }
  if (pathname === "/api/attendance/regularization" && method === "POST") {
    const item = { id: `reg-demo-${Date.now()}`, date: new Date().toISOString().slice(0, 10), employee: state.employees[0], regularization: { status: "PENDING", reason: body.reason || "Demo regularization request" } };
    state.regularizations.unshift(item);
    persistState(state);
    return success(item, 201);
  }
  if (pathname.startsWith("/api/attendance/regularization/") && pathname.endsWith("/decision") && method === "POST") {
    const id = pathname.split("/")[4];
    const item = state.regularizations.find((row: any) => row.id === id);
    if (!item) return failure("Regularization not found", 404);
    item.regularization.status = body.decision;
    persistState(state);
    return success(item);
  }

  if (pathname === "/api/leave" && method === "GET") return success(leavePayload(state));
  if (pathname === "/api/leave" && method === "POST") {
    const employee = state.employees[0];
    const leaveType = state.leaveTypes.find((item: any) => item.id === body.leaveTypeId) || state.leaveTypes[0];
    const request = { id: `lr-demo-${Date.now()}`, employeeCode: employee.employeeCode, employeeName: `${employee.firstName} ${employee.lastName}`, leaveTypeCode: leaveType.code, startDate: body.startDate, endDate: body.endDate, reason: body.reason || "", status: "PENDING", workflow: { stage: "MANAGER_PENDING" } };
    state.leaveRequests.unshift(request);
    persistState(state);
    return success(request, 201);
  }
  if (pathname.startsWith("/api/leave/") && pathname.endsWith("/decision") && method === "POST") {
    const id = pathname.split("/")[3];
    const request = state.leaveRequests.find((item: any) => item.id === id);
    if (!request) return failure("Leave request not found", 404);
    request.status = body.decision;
    request.workflow = { stage: body.decision === "APPROVED" ? "COMPLETED" : "REJECTED" };
    if (body.decision === "APPROVED") {
      const balance = state.leaveBalances.find((item: any) => item.employeeCode === request.employeeCode && item.leaveTypeCode === request.leaveTypeCode && item.year === 2026);
      if (balance) balance.used = Number(balance.used || 0) + 1;
    }
    persistState(state);
    return success(request);
  }

  if (pathname === "/api/payroll/runs" && method === "GET") return success(payrollPayload(state));
  if (pathname === "/api/payroll/runs" && method === "POST") {
    const month = Number(body?.month || new Date().getMonth() + 1);
    const year = Number(body?.year || new Date().getFullYear());
    const id = `pr-demo-${year}-${String(month).padStart(2, "0")}`;
    const run = { id, month, year, status: "PROCESSING", summaryJson: { totals: { gross: 0, deductions: 0, net: 0 } } };
    const items = state.employees.map((employee: any, index: number) => {
      const gross = Number(employee.salaryMonthly);
      const deductions = Math.round(gross * 0.11);
      const netPay = gross - deductions;
      run.summaryJson.totals.gross += gross;
      run.summaryJson.totals.deductions += deductions;
      run.summaryJson.totals.net += netPay;
      return { id: `pi-demo-${Date.now()}-${index}`, payrollRunId: id, employeeCode: employee.employeeCode, grossPay: gross, deductions, netPay };
    });
    state.payrollRuns.unshift({ ...run, _count: { items: items.length } });
    state.payrollItems.unshift(...items);
    persistState(state);
    return success(run, 201);
  }
  if (pathname.startsWith("/api/payroll/runs/") && pathname.endsWith("/finalize") && method === "POST") {
    const id = pathname.split("/")[4];
    const run = state.payrollRuns.find((item: any) => item.id === id);
    if (!run) return failure("Payroll run not found", 404);
    run.status = "COMPLETED";
    persistState(state);
    return success(run);
  }
  if (pathname === "/api/payroll/payslips" && method === "GET") return success(state.payslips);

  if (pathname === "/api/reports/overview" && method === "GET") {
    return success({
      kpis: {
        todayAttendance: [
          { status: "PRESENT", _count: state.attendanceRecords.filter((item: any) => item.status === "PRESENT").length },
          { status: "ABSENT", _count: state.attendanceRecords.filter((item: any) => item.status === "ABSENT").length }
        ],
        openJobs: state.jobOpenings.length,
        interviewsToday: state.candidates.filter((candidate: any) => candidate.stage === "INTERVIEW_SCHEDULED").length
      }
    });
  }
  if (pathname === "/api/reports/export" && method === "GET") {
    return responseJson({ success: true, data: { message: "Demo mode export disabled. Use dashboard data preview instead." } });
  }
  if (pathname === "/api/settings/bootstrap" && method === "GET") return success({ departments: state.departments, designations: state.designations, settings: state.settings });

  if (pathname === "/api/ats/stages" && method === "GET") return success(state.recruitmentStages);
  if (pathname === "/api/ats/candidates" && method === "GET") return success(atsCandidatesPayload(state, requestUrl.searchParams));
  if (pathname === "/api/ats/candidates" && method === "POST") {
    const opening = state.jobOpenings[0];
    const candidate = { id: `cand-demo-${Date.now()}`, jobOpeningId: opening.id, fullName: body.fullName, email: body.email, phone: body.phone || null, currentLocation: body.currentLocation || null, noticePeriodDays: body.noticePeriodDays || null, totalExperience: body.totalExperience || null, skills: body.skills || [], education: body.education || null, stage: "APPLIED", source: body.source, rating: 3, rejectionReason: null, assignedRecruiterId: null, duplicateHash: `${body.email}:${body.phone || ""}`, joinedEmployeeId: null, comments: [], activity: [{ id: `cand-act-${Date.now()}`, action: "Candidate created in demo mode" }], interviews: [], offer: null, onboardingTasks: [], parsedResume: body };
    state.candidates.unshift(candidate);
    persistState(state);
    return success(candidate, 201);
  }
  if (pathname.startsWith("/api/ats/candidates/") && pathname.endsWith("/comments") && method === "POST") {
    const id = pathname.split("/")[4];
    const candidate = state.candidates.find((item: any) => item.id === id);
    if (!candidate) return failure("Candidate not found", 404);
    const comment = { id: `comment-${Date.now()}`, comment: body.comment, authorId: state.currentUser.sub };
    candidate.comments = candidate.comments || [];
    candidate.comments.unshift(comment);
    persistState(state);
    return success(comment, 201);
  }
  if (pathname.startsWith("/api/ats/candidates/") && pathname.endsWith("/convert") && method === "POST") {
    const id = pathname.split("/")[4];
    const candidate = state.candidates.find((item: any) => item.id === id);
    if (!candidate) return failure("Candidate not found", 404);
    candidate.stage = "JOINED";
    candidate.joinedEmployeeId = candidate.joinedEmployeeId || `emp-from-${id}`;
    persistState(state);
    return success({ employeeId: candidate.joinedEmployeeId, candidateId: candidate.id });
  }
  if (pathname.startsWith("/api/ats/candidates/") && method === "PATCH") {
    const id = pathname.split("/")[4];
    const candidate = state.candidates.find((item: any) => item.id === id);
    if (!candidate) return failure("Candidate not found", 404);
    candidate.stage = body.stage || candidate.stage;
    persistState(state);
    return success(candidate);
  }
  if (pathname === "/api/ats/jobs" && method === "GET") return success(state.jobOpenings);
  if (pathname.startsWith("/api/ats/jobs/") && method === "GET") {
    const id = pathname.split("/")[4];
    const job = state.jobOpenings.find((item: any) => item.id === id);
    if (!job) return failure("Job not found", 404);
    return success(job);
  }
  if (pathname === "/api/ats/interviews" && method === "GET") return success(state.interviews);
  if (pathname === "/api/ats/pipeline" && method === "GET") {
    return success({
      stages: state.recruitmentStages.map((stage: any) => ({ ...stage, _count: state.candidates.filter((candidate: any) => candidate.stage === stage.stage).length }))
    });
  }
  if (pathname === "/api/careers/jobs" && method === "GET") return success(state.jobOpenings);
  if (pathname === "/api/careers/apply" && method === "POST") {
    const opening = state.jobOpenings.find((item: any) => item.id === body.jobOpeningId) || state.jobOpenings[0];
    const candidate = { id: `cand-careers-${Date.now()}`, jobOpeningId: opening.id, fullName: body.fullName, email: body.email, phone: body.phone || null, currentLocation: null, noticePeriodDays: null, totalExperience: null, skills: body.skills || [], education: body.education || null, stage: "APPLIED", source: "CAREERS_PORTAL", rating: 3, comments: [], activity: [{ id: `act-careers-${Date.now()}`, action: "Applied from careers page" }], interviews: [], offer: null, onboardingTasks: [], parsedResume: body };
    state.candidates.unshift(candidate);
    opening.candidates.push(candidate);
    persistState(state);
    return success({ message: "Application submitted successfully" }, 201);
  }
  if (pathname === "/api/documents" && method === "GET") return success(state.documents);
  if (pathname === "/api/documents" && method === "POST") {
    const doc = { id: `doc-demo-${Date.now()}`, type: body.type || "OTHER", fileName: body.file?.name || "uploaded-file.pdf", filePath: `/demo/uploads/${body.file?.name || "uploaded-file.pdf"}`, version: 1, employeeId: body.employeeId || null, candidateId: body.candidateId || null };
    state.documents.unshift(doc);
    persistState(state);
    return success(doc, 201);
  }
  if (pathname === "/api/performance" && method === "GET") return success({ cycles: state.performanceCycles });
  if (pathname === "/api/performance" && method === "POST") {
    const cycle = { id: `cycle-demo-${Date.now()}`, name: body.name, startDate: body.startDate, endDate: body.endDate, status: body.status || "DRAFT" };
    state.performanceCycles.unshift(cycle);
    persistState(state);
    return success(cycle, 201);
  }
  if (pathname === "/api/performance/reviews" && method === "GET") return success(state.performanceReviews);
  if (pathname === "/api/performance/reviews" && method === "POST") {
    const review = { id: `rev-demo-${Date.now()}`, employeeId: body.employeeId, cycleId: body.cycleId, employee: state.employees.find((item: any) => item.id === body.employeeId), selfRating: body.selfRating ?? null, managerRating: body.managerRating ?? null, notes: body.notes || "" };
    state.performanceReviews.unshift(review);
    persistState(state);
    return success(review, 201);
  }
  if (pathname === "/api/performance/goals" && method === "GET") return success(state.performanceGoals);
  if (pathname === "/api/performance/goals" && method === "POST") {
    const goal = { id: `goal-demo-${Date.now()}`, ...body };
    state.performanceGoals.unshift(goal);
    persistState(state);
    return success(goal, 201);
  }
  if (pathname === "/api/onboarding" && method === "GET") return success(state.onboardingTasks);
  if (pathname.startsWith("/api/onboarding/") && pathname.endsWith("/status") && method === "POST") {
    const id = pathname.split("/")[3];
    const task = state.onboardingTasks.find((item: any) => item.id === id);
    if (!task) return failure("Task not found", 404);
    task.status = body.status;
    persistState(state);
    return success(task);
  }

  return failure("Demo endpoint not implemented", 404);
}

export async function demoRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await handleDemoRequest(url, init);
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error?.message || json.error || "Request failed");
  }
  return (json.data ?? json) as T;
}

export async function enableDemoMode() {
  if (!isBrowser()) return;
  if (!isDemoRequested() && !readCookie(DEMO_COOKIE) && localStorage.getItem(DEMO_STATE_KEY) === null) return;
  localStorage.setItem(DEMO_STATE_KEY, "active");
  writeCookie(DEMO_COOKIE, "true");
  if (!originalFetch) {
    originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (!isDemoMode() || !requestUrl.includes("/api/")) {
        return originalFetch!(input as RequestInfo, init);
      }
      return handleDemoRequest(requestUrl, init);
    };
  }
  if (!bootstrapped) {
    await getState();
    bootstrapped = true;
  }
}

export function DemoModeBootstrapper() {
  useEffect(() => {
    void enableDemoMode();
  }, []);
  return null;
}

export function isDemoBannerVisible() {
  return isDemoMode();
}

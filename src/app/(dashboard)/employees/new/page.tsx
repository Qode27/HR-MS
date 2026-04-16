"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { Textarea } from "@/components/ui/textarea";
import { useDemoMode } from "@/lib/demo";

export default function NewEmployeePage() {
  const router = useRouter();
  const isDemo = useDemoMode();
  const [bootstrap, setBootstrap] = useState<{
    departments: Array<{ id: string; name: string }>;
    designations: Array<{ id: string; name: string }>;
    managers: Array<{ id: string; firstName: string; lastName: string; employeeCode: string }>;
    locations: Array<{ id: string; name: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    personalEmail: "",
    phone: "",
    joiningDate: new Date().toISOString().slice(0, 10),
    employmentType: "FULL_TIME",
    departmentId: "",
    designationId: "",
    managerId: "",
    workLocationId: "",
    salaryMonthly: 50000,
    skills: "",
    emergencyName: "",
    emergencyPhone: ""
  });

  useEffect(() => {
    api<{
      departments: Array<{ id: string; name: string }>;
      designations: Array<{ id: string; name: string }>;
      managers: Array<{ id: string; firstName: string; lastName: string; employeeCode: string }>;
      locations: Array<{ id: string; name: string }>;
    }>("/api/employees/bootstrap")
      .then((d) => {
        setBootstrap(d);
        if (d.departments[0]) setForm((p) => ({ ...p, departmentId: p.departmentId || d.departments[0].id }));
        if (d.designations[0]) setForm((p) => ({ ...p, designationId: p.designationId || d.designations[0].id }));
      })
      .catch((e) => toast.error(e.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api<{ id: string }>("/api/employees", {
        method: "POST",
        body: JSON.stringify({
        ...form,
          managerId: form.managerId || undefined,
          workLocationId: form.workLocationId || undefined,
          emergencyContact: form.emergencyName || form.emergencyPhone ? { name: form.emergencyName, phone: form.emergencyPhone } : undefined,
        skills: form.skills ? form.skills.split(",").map((x) => x.trim()) : []
        })
      });
      toast.success(isDemo ? "Demo mode: action not saved" : "Employee created");
      router.push("/employees");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create employee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <PageHeader title="Add Employee" subtitle="Create new employee profile" />
      <Card>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
          <Input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <Input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          <Input type="email" placeholder="Email" value={form.personalEmail} onChange={(e) => setForm({ ...form, personalEmail: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} required>
            {(bootstrap?.departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.designationId} onChange={(e) => setForm({ ...form, designationId: e.target.value })} required>
            {(bootstrap?.designations || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
            <option value="">No manager</option>
            {(bootstrap?.managers || []).map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.employeeCode})</option>)}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.workLocationId} onChange={(e) => setForm({ ...form, workLocationId: e.target.value })}>
            <option value="">No location</option>
            {(bootstrap?.locations || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <Input type="number" placeholder="Salary" value={form.salaryMonthly} onChange={(e) => setForm({ ...form, salaryMonthly: Number(e.target.value) })} required />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERN">Intern</option>
          </select>
          <Input placeholder="Emergency contact name" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
          <Input placeholder="Emergency contact phone" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
          <Input className="md:col-span-2" placeholder="Skills (comma separated)" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
          <Textarea className="md:col-span-2" placeholder="Notes for onboarding/profile context" />
          <Button className="md:col-span-2" disabled={loading}>{loading ? "Creating..." : isDemo ? "Save demo employee" : "Create Employee"}</Button>
        </form>
      </Card>
    </section>
  );
}

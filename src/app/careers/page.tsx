"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CareersPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [form, setForm] = useState({ jobOpeningId: "", fullName: "", email: "", phone: "", skills: "", education: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/careers/jobs").then((r) => r.json()).then((d) => {
      setJobs(d.data || []);
      if ((d.data || [])[0]) setForm((f) => ({ ...f, jobOpeningId: d.data[0].id }));
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/careers/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, skills: form.skills.split(",").map((x) => x.trim()).filter(Boolean) })
    });
    const json = await res.json();
    setMessage(json.error || "Application submitted successfully");
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-semibold">Careers at PeopleFlow HR</h1>
        <p className="text-muted-foreground">Join our growing team</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="mb-3 font-medium">Open Roles</p>
          {jobs.map((job) => (
            <div key={job.id} className="mb-2 rounded border p-2 text-sm">
              <p className="font-medium">{job.title}</p>
              <p className="text-muted-foreground">{job.workLocation?.name || "Remote"}</p>
            </div>
          ))}
        </Card>
        <Card>
          <p className="mb-3 font-medium">Apply Now</p>
          <form className="space-y-2" onSubmit={submit}>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.jobOpeningId} onChange={(e) => setForm({ ...form, jobOpeningId: e.target.value })}>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <Input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Skills (comma separated)" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
            <Input placeholder="Education" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
            <Button className="w-full">Submit Application</Button>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </form>
        </Card>
      </div>
    </main>
  );
}

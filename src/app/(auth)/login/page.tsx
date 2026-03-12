"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@peopleflow.local");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok || json.success === false) return setError(json.error?.message || json.error || "Login failed");
    router.push("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 space-y-1 text-center">
          <h1 className="text-2xl font-semibold">PeopleFlow HR</h1>
          <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
        </form>
      </Card>
    </main>
  );
}

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!token) return setError("Invalid reset link");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password !== confirm) return setError("Passwords do not match");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) return setError(json.error?.message || "Reset failed");
    setMessage("Password reset successful. Redirecting to login...");
    setTimeout(() => router.push("/login"), 900);
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="mb-1 text-xl font-semibold">Reset password</h1>
        <p className="mb-4 text-sm text-muted-foreground">Set a new secure password for your account.</p>
        <form className="space-y-3" onSubmit={submit}>
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
          <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          <Button className="w-full">Reset Password</Button>
        </form>
      </Card>
    </main>
  );
}

"use client";

import { useState } from "react";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const json = await res.json();
    setMessage(json.data?.message || json.error?.message || json.error || "Done");
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="mb-1 text-xl font-semibold">Forgot password</h1>
        <p className="mb-4 text-sm text-muted-foreground">Enter your email and we will send reset instructions.</p>
        <form className="space-y-3" onSubmit={submit}>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <Button className="w-full">Send reset link</Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </form>
      </Card>
    </main>
  );
}

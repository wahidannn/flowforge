"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

export function LoginPanel() {
  const setToken = useAuthStore((state) => state.setToken);
  const [email, setEmail] = useState("pm@flowforge.test");
  const [password, setPassword] = useState("password123");
  const mutation = useMutation({
    mutationFn: api.login,
    onSuccess: (data) => setToken(data.token),
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <section className="border border-line bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">FlowForge</h1>
        <p className="mt-2 text-sm text-slate-600">Masuk untuk mengelola delivery board.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ email, password });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {mutation.error ? <p className="text-sm text-coral">{mutation.error.message}</p> : null}
          <Button className="w-full" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}

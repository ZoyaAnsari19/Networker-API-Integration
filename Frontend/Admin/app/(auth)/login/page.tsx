"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, isAuthenticated } = useAdminAuthStore();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const eTrim = email.trim();
    if (!eTrim || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      await login(eTrim, password);
      router.replace("/dashboard");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-[calc(100vh-0px)] flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md text-white shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Admin Portal
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Sign in with your admin credentials to continue.
            </p>
          </div>
        </div>

        <div className="rounded-[14px] border border-slate-200 bg-white shadow-sm p-5 sm:p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="admin@company.com"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-sm font-semibold text-rose-700">
                  {error}
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" loading={isLoading}>
              Sign in
            </Button>

            <p className="text-xs text-slate-400 leading-snug">
              Having trouble? Make sure the backend API base URL is set via{" "}
              <span className="font-mono">NEXT_PUBLIC_API_BASE_URL</span>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

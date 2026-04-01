"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";

type Props = {
  redirectPath?: string;
};

export default function LoginForm({ redirectPath }: Props) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) return;
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError("Supabase is not configured (check NEXT_PUBLIC_SUPABASE_URL / ANON KEY).");
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) {
        setError(signInErr.message);
        return;
      }

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) {
        setError(userErr.message);
        return;
      }

      if (!user) {
        setError("No authenticated user found. Please try again.");
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id" as unknown as never, user.id)
        .maybeSingle();

      if (profileErr) {
        setError(profileErr.message);
        return;
      }

      const role = ((profile as unknown as { role?: UserRole | null } | null | undefined)?.role ??
        "client") as UserRole;
      const target = role === "admin" ? "/admin" : "/dashboard";

      // If redirectPath is present and looks like an internal route, use it.
      if (redirectPath && redirectPath.startsWith("/")) {
        router.push(redirectPath);
      } else {
        router.push(target);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-xl p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-[#555555]">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            className="w-full rounded-lg bg-[#FAFAF8] border border-[#E8E8E8] px-3 py-2 outline-none focus:border-white/30"
            placeholder="you@company.com"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-[#555555]">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg bg-[#FAFAF8] border border-[#E8E8E8] px-3 py-2 outline-none focus:border-white/30"
            placeholder="••••••••"
          />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <Button type="submit" disabled={!canSubmit || isLoading} className="h-11 rounded-lg">
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}


"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "agent" | "landlord">("student");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setMessage("Check your email to confirm your account, then sign in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Create account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Full name</label>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">I am a</label>
          <select value={role} onChange={(e) => setRole(e.target.value as "student" | "agent" | "landlord")}
            className="w-full rounded border border-zinc-300 px-3 py-2">
            <option value="student">Student / House seeker</option>
            <option value="agent">Property agent</option>
            <option value="landlord">Landlord / Property owner</option>
          </select>
          <p className="mt-1 text-xs text-zinc-500">Admin accounts are provisioned separately.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <button type="submit" disabled={loading} className="w-full rounded bg-zinc-900 py-2 text-white hover:bg-zinc-700 disabled:opacity-50">
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-600">
        Have an account? <Link href="/auth/sign-in" className="text-zinc-900 underline">Sign in</Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return <Suspense fallback={<div>Loading...</div>}><SignUpForm /></Suspense>;
}

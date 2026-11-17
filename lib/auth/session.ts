import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export async function getCurrentUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
}

export function roleDashboardPath(role: UserRole | string | null | undefined) {
  switch (role) {
    case "student": return "/student";
    case "agent": return "/agent";
    case "landlord": return "/landlord";
    case "admin": return "/admin";
    default: return "/dashboard";
  }
}

export async function requireProfile(allowed?: UserRole[]) {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) return null;
  if (allowed && !allowed.includes(profile.role)) return null;
  return profile;
}

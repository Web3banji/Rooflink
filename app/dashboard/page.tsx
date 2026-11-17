import { redirect } from "next/navigation";
import { getCurrentProfile, roleDashboardPath } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardRedirect() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/sign-in");
  redirect(roleDashboardPath(profile.role));
}

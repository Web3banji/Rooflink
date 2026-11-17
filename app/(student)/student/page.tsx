import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type SavedRow = { id: string; created_at: string; properties: { id: string; title: string; status: string; price_amount: number; currency: string; price_period: string } | null };
type EnquiryRow = { id: string; message: string; status: string; created_at: string; properties: { id: string; title: string } | null };

export default async function StudentDashboard() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/sign-in");
  if (profile.role !== "student") redirect("/dashboard");

  const supabase = await createClient();
  if (!supabase) return <main className="p-10">Supabase not configured.</main>;
  const { data: saved } = await supabase
    .from("saved_properties")
    .select("id, created_at, properties(id, title, status, price_amount, currency, price_period)")
    .eq("student_profile_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: enquiries } = await supabase
    .from("enquiries")
    .select("id, message, status, created_at, properties(id, title)")
    .eq("sender_profile_id", profile.id)
    .order("created_at", { ascending: false });

  async function signOut() {
    "use server";
    const sb = await createClient();
    await sb?.auth.signOut();
    redirect("/");
  }

  const savedRows = (saved ?? []) as unknown as SavedRow[];
  const enquiryRows = (enquiries ?? []) as unknown as EnquiryRow[];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Student dashboard</h1>
          <p className="text-sm text-zinc-600">{profile.full_name || profile.id}</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/listings" className="underline">Browse listings</Link>
          <form action={signOut}><button className="underline">Sign out</button></form>
        </div>
      </header>
      <section className="mb-8">
        <h2 className="mb-2 text-xl font-medium">Saved properties</h2>
        {!savedRows.length ? <p className="text-zinc-600">No saved properties yet.</p> : (
          <ul className="space-y-2">{savedRows.map((s) => (
            <li key={s.id} className="rounded border border-zinc-200 bg-white p-3">
              <Link href={`/listings/${s.properties?.id}`} className="font-medium underline">{s.properties?.title || "Listing"}</Link>
              <div className="text-sm text-zinc-600">{s.properties?.currency} {Number(s.properties?.price_amount || 0).toLocaleString()} / {s.properties?.price_period}</div>
            </li>
          ))}</ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-xl font-medium">My enquiries</h2>
        {!enquiryRows.length ? <p className="text-zinc-600">No enquiries yet. Open an approved listing to enquire.</p> : (
          <ul className="space-y-2">{enquiryRows.map((e) => (
            <li key={e.id} className="rounded border border-zinc-200 bg-white p-3">
              <div className="font-medium">{e.properties?.title || "Property"}</div>
              <div className="text-sm text-zinc-700">{e.message}</div>
              <div className="text-xs text-zinc-500">Status: {e.status}</div>
            </li>
          ))}</ul>
        )}
      </section>
    </main>
  );
}

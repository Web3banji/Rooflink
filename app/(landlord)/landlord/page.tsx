import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type PropertyRow = { id: string; title: string; status: string; price_amount: number; currency: string };
type EnquiryRow = { id: string; message: string; status: string; created_at: string; properties: { title: string } | null };

export default async function LandlordDashboard() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/sign-in");
  if (profile.role !== "landlord") redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) return <main className="p-10">Supabase not configured. Add env vars in .env.local.</main>;

  const { data: properties } = await supabase
    .from("properties")
    .select("id, title, status, price_amount, currency, created_at")
    .eq("owner_profile_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: enquiries } = await supabase
    .from("enquiries")
    .select("id, message, status, created_at, properties(title)")
    .eq("recipient_profile_id", profile.id)
    .order("created_at", { ascending: false });

  async function createDraft(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p || p.role !== "landlord") redirect("/dashboard");
    const sb = await createClient();
    if (!sb) return;
    const { data: uni } = await sb.from("universities").select("id").eq("is_active", true).limit(1).single();
    if (!uni?.id) return;
    await sb.from("properties").insert({
      owner_profile_id: p.id,
      lister_role: "landlord",
      university_id: uni.id,
      title: String(formData.get("title") || "Untitled listing"),
      description: String(formData.get("description") || "Description pending"),
      property_type: String(formData.get("property_type") || "apartment"),
      address_text: String(formData.get("address_text") || "Address pending"),
      price_amount: Number(formData.get("price_amount") || 0),
      price_period: "yearly",
      currency: "NGN",
      bedrooms: Number(formData.get("bedrooms") || 0) || null,
      bathrooms: Number(formData.get("bathrooms") || 0) || null,
      status: "draft",
    });
    revalidatePath("/landlord");
  }

  async function submitForReview(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p || p.role !== "landlord") redirect("/dashboard");
    const id = String(formData.get("id"));
    const sb = await createClient();
    if (!sb) return;
    await sb.from("properties").update({ status: "pending_review", submitted_at: new Date().toISOString() }).eq("id", id).eq("owner_profile_id", p.id);
    revalidatePath("/landlord");
  }

  const propertyRows = (properties ?? []) as PropertyRow[];
  const enquiryRows = (enquiries ?? []) as unknown as EnquiryRow[];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Landlord dashboard</h1>
        <Link href="/listings" className="text-sm underline">Browse approved listings</Link>
      </div>
      <section className="mb-8 rounded border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-medium">Create draft listing</h2>
        <form action={createDraft} className="grid gap-3 sm:grid-cols-2">
          <input name="title" placeholder="Title" required className="rounded border px-3 py-2" />
          <input name="property_type" placeholder="Property type" className="rounded border px-3 py-2" />
          <input name="address_text" placeholder="Address" required className="rounded border px-3 py-2 sm:col-span-2" />
          <input name="price_amount" type="number" min="0" step="0.01" placeholder="Price amount" required className="rounded border px-3 py-2" />
          <div className="grid grid-cols-2 gap-3">
            <input name="bedrooms" type="number" min="0" placeholder="Bedrooms" className="rounded border px-3 py-2" />
            <input name="bathrooms" type="number" min="0" placeholder="Bathrooms" className="rounded border px-3 py-2" />
          </div>
          <textarea name="description" placeholder="Description" required className="rounded border px-3 py-2 sm:col-span-2" />
          <button className="rounded bg-zinc-900 px-4 py-2 text-white sm:col-span-2">Create draft</button>
        </form>
      </section>
      <section className="mb-8">
        <h2 className="mb-2 text-xl font-medium">My listings</h2>
        {!propertyRows.length ? <p className="text-zinc-600">No listings yet.</p> : (
          <ul className="space-y-2">{propertyRows.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded border border-zinc-200 bg-white p-3">
              <div>
                <Link href={`/listings/${p.id}`} className="font-medium underline">{p.title}</Link>
                <div className="text-sm text-zinc-600">{p.currency} {Number(p.price_amount).toLocaleString()} · <strong>{p.status}</strong></div>
              </div>
              {(p.status === "draft" || p.status === "rejected") && (
                <form action={submitForReview}><input type="hidden" name="id" value={p.id} /><button className="rounded border px-3 py-1 text-sm">Submit for review</button></form>
              )}
            </li>
          ))}</ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-xl font-medium">Enquiries received</h2>
        {!enquiryRows.length ? <p className="text-zinc-600">No enquiries yet.</p> : (
          <ul className="space-y-2">{enquiryRows.map((e) => (
            <li key={e.id} className="rounded border border-zinc-200 bg-white p-3">
              <div className="font-medium">{e.properties?.title || "Property"}</div>
              <div className="text-sm">{e.message}</div>
              <div className="text-xs text-zinc-500">Status: {e.status}</div>
            </li>
          ))}</ul>
        )}
      </section>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const profile = await getCurrentProfile();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (!property) notFound();
  if (property.status !== "approved" && property.owner_profile_id !== profile?.id && profile?.role !== "admin") {
    notFound();
  }

  const { data: images } = await supabase
    .from("property_images")
    .select("id, storage_path, is_cover")
    .eq("property_id", id)
    .order("sort_order", { ascending: true });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/listings" className="text-sm underline">← Back to listings</Link>
      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-6">
        <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">{property.property_type} · {property.status}</div>
        <h1 className="text-3xl font-semibold">{property.title}</h1>
        <p className="mt-2 text-zinc-700">{property.description}</p>
        <div className="mt-4 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
          <p><strong>Price:</strong> {property.currency} {Number(property.price_amount).toLocaleString()} / {property.price_period}</p>
          <p><strong>Address:</strong> {property.address_text}</p>
          <p><strong>Bedrooms:</strong> {property.bedrooms ?? "-"}</p>
          <p><strong>Bathrooms:</strong> {property.bathrooms ?? "-"}</p>
          <p><strong>Availability:</strong> {property.availability_status}</p>
        </div>
        {images && images.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 font-medium">Images</h2>
            <ul className="list-disc pl-5 text-sm text-zinc-600">
              {images.map((img) => <li key={img.id}>{img.storage_path}{img.is_cover ? " (cover)" : ""}</li>)}
            </ul>
          </div>
        )}
        <div className="mt-6 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {profile?.role === "student" ? (
            <span>Signed in as student. Save/enquiry actions are available from your student dashboard once configured.</span>
          ) : profile ? (
            <span>Signed in as {profile.role}. Use your dashboard to manage or review listings.</span>
          ) : (
            <span><Link href="/auth/sign-in" className="underline">Sign in</Link> as a student to save this property or send an enquiry.</span>
          )}
        </div>
      </div>
    </main>
  );
}

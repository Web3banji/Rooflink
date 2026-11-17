import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Approved listings</h1>
        <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
          Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.
        </p>
      </main>
    );
  }

  const { data: listings, error } = await supabase
    .from("properties")
    .select("id, title, description, property_type, address_text, price_amount, price_period, currency, bedrooms, bathrooms, status, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Approved listings</h1>
        <Link href="/" className="text-sm underline">Home</Link>
      </div>
      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700">Failed to load listings. Check Supabase configuration and migrations.</p>}
      {!error && (!listings || listings.length === 0) && (
        <p className="text-zinc-600">No approved listings yet. Listings appear here after admin approval.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings?.map((p) => (
          <Link key={p.id} href={`/listings/${p.id}`} className="rounded-lg border border-zinc-200 bg-white p-4 hover:shadow-sm">
            <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">{p.property_type}</div>
            <h2 className="text-lg font-medium">{p.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{p.description}</p>
            <p className="mt-3 text-sm font-semibold">
              {p.currency} {Number(p.price_amount).toLocaleString()} / {p.price_period}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{p.address_text}</p>
            <p className="mt-1 text-xs text-zinc-500">{p.bedrooms ?? "-"} bed · {p.bathrooms ?? "-"} bath</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

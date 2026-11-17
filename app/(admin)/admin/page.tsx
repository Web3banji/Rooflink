import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type PropertyRow = { id: string; title: string; owner_profile_id: string; lister_role: string; status: string; created_at: string; submitted_at: string | null };
type ReportRow = { id: string; reason: string; details: string | null; status: string; created_at: string; property_id: string | null };
type AuditRow = { id: string; action: string; entity_type: string; entity_id: string | null; created_at: string; actor_profile_id: string };

export default async function AdminDashboard() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/sign-in");
  if (profile.role !== "admin") redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) return <main className="p-10">Supabase not configured.</main>;

  const { data: pending } = await supabase
    .from("properties")
    .select("id, title, owner_profile_id, lister_role, status, created_at, submitted_at")
    .in("status", ["pending_review", "draft", "rejected", "approved", "archived"])
    .order("created_at", { ascending: false });

  const { data: reports } = await supabase
    .from("reports")
    .select("id, reason, details, status, created_at, property_id")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: audits } = await supabase
    .from("admin_audit_records")
    .select("id, action, entity_type, entity_id, created_at, actor_profile_id")
    .order("created_at", { ascending: false })
    .limit(50);

  async function reviewListing(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p || p.role !== "admin") redirect("/dashboard");
    const id = String(formData.get("id"));
    const decision = String(formData.get("decision"));
    const reason = String(formData.get("reason") || "");
    const sb = await createClient();
    if (!sb) return;

    const { data: before } = await sb.from("properties").select("*").eq("id", id).single();
    const status = decision === "approve" ? "approved" : "rejected";
    const { data: after } = await sb.from("properties").update({
      status,
      reviewed_by: p.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: decision === "reject" ? reason || "Not specified" : null,
    }).eq("id", id).select().single();

    await sb.from("admin_audit_records").insert({
      actor_profile_id: p.id,
      action: `property.${status}`,
      entity_type: "property",
      entity_id: id,
      before,
      after,
      metadata: { reason: reason || null },
    });
    revalidatePath("/admin");
  }

  async function resolveReport(formData: FormData) {
    "use server";
    const p = await getCurrentProfile();
    if (!p || p.role !== "admin") redirect("/dashboard");
    const id = String(formData.get("id"));
    const resolution = String(formData.get("resolution") || "resolved");
    const note = String(formData.get("note") || "");
    const sb = await createClient();
    if (!sb) return;
    const { data: before } = await sb.from("reports").select("*").eq("id", id).single();
    const { data: after } = await sb.from("reports").update({
      status: resolution === "dismiss" ? "dismissed" : "resolved",
      resolved_by: p.id,
      resolved_at: new Date().toISOString(),
      resolution_note: note || null,
    }).eq("id", id).select().single();
    await sb.from("admin_audit_records").insert({
      actor_profile_id: p.id,
      action: `report.${after?.status ?? "resolved"}`,
      entity_type: "report",
      entity_id: id,
      before,
      after,
    });
    revalidatePath("/admin");
  }

  const pendingRows = (pending ?? []) as PropertyRow[];
  const reportRows = (reports ?? []) as ReportRow[];
  const auditRows = (audits ?? []) as AuditRow[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Admin dashboard</h1>
      <section className="mb-10">
        <h2 className="mb-3 text-xl font-medium">Listings (approval workflow)</h2>
        {!pendingRows.length ? <p className="text-zinc-600">No listings found.</p> : (
          <div className="space-y-3">{pendingRows.map((p) => (
            <div key={p.id} className="rounded border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-sm text-zinc-600">ID: {p.id} · Status: <strong>{p.status}</strong> · Lister: {p.lister_role}</div>
                </div>
                {p.status === "pending_review" && (
                  <form action={reviewListing} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input name="reason" placeholder="Rejection reason (if rejecting)" className="rounded border px-2 py-1 text-sm" />
                    <button name="decision" value="approve" className="rounded bg-green-700 px-3 py-1 text-sm text-white">Approve</button>
                    <button name="decision" value="reject" className="rounded bg-red-700 px-3 py-1 text-sm text-white">Reject</button>
                  </form>
                )}
              </div>
            </div>
          ))}</div>
        )}
      </section>
      <section className="mb-10">
        <h2 className="mb-3 text-xl font-medium">Reports</h2>
        {!reportRows.length ? <p className="text-zinc-600">No reports.</p> : (
          <div className="space-y-2">{reportRows.map((r) => (
            <div key={r.id} className="rounded border border-zinc-200 bg-white p-3">
              <div className="text-sm"><strong>{r.reason}</strong> — {r.status}</div>
              {r.details && <div className="text-sm text-zinc-700">{r.details}</div>}
              {r.status !== "resolved" && r.status !== "dismissed" && (
                <form action={resolveReport} className="mt-2 flex gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input name="note" placeholder="Resolution note" className="rounded border px-2 py-1 text-sm" />
                  <button name="resolution" value="resolve" className="rounded border px-2 py-1 text-sm">Resolve</button>
                  <button name="resolution" value="dismiss" className="rounded border px-2 py-1 text-sm">Dismiss</button>
                </form>
              )}
            </div>
          ))}</div>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-xl font-medium">Audit records (recent)</h2>
        {!auditRows.length ? <p className="text-zinc-600">No audit records yet.</p> : (
          <ul className="space-y-1 text-sm">{auditRows.map((a) => (
            <li key={a.id} className="rounded border border-zinc-200 bg-white p-2">
              <strong>{a.action}</strong> · {a.entity_type}:{a.entity_id} · {new Date(a.created_at).toLocaleString()}
            </li>
          ))}</ul>
        )}
      </section>
    </main>
  );
}

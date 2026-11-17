import Link from "next/link";
import { getCurrentProfile, roleDashboardPath } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const dash = profile ? roleDashboardPath(profile.role) : "/auth/sign-in";

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-tight">RoofLink</Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/listings" className="hover:underline">Browse listings</Link>
          <Link href={dash} className="rounded bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-700">
            {profile ? "Dashboard" : "Sign in"}
          </Link>
        </nav>
      </header>
      <section className="flex flex-1 flex-col justify-center gap-6 py-16">
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
          Find trusted accommodation near your university.
        </h1>
        <p className="max-w-xl text-lg text-zinc-600">
          RoofLink connects students, landlords, and property agents in one place. Browse approved listings,
          save properties, and send enquiries with confidence.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/listings" className="rounded bg-zinc-900 px-5 py-2.5 text-white hover:bg-zinc-700">
            Explore approved listings
          </Link>
          <Link href="/auth/sign-up" className="rounded border border-zinc-300 px-5 py-2.5 hover:bg-zinc-100">
            Create an account
          </Link>
        </div>
      </section>
      <footer className="border-t pt-6 text-sm text-zinc-500">© {new Date().getFullYear()} RoofLink</footer>
    </main>
  );
}

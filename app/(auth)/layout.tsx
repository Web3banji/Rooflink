import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 block text-center text-xl font-semibold">RoofLink</Link>
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}

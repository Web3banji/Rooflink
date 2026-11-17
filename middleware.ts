import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const rolePaths: Record<string, string> = {
  "/student": "student",
  "/agent": "agent",
  "/landlord": "landlord",
  "/admin": "admin",
};

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, role } = await updateSession(request);
  const path = request.nextUrl.pathname;

  for (const [prefix, required] of Object.entries(rolePaths)) {
    if (path.startsWith(prefix)) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/sign-in";
        url.searchParams.set("next", path);
        return NextResponse.redirect(url);
      }
      if (role !== required) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  if (path.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

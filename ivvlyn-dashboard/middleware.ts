import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import type { UserRole } from "@/lib/types";

function redirectTo(url: string, req: NextRequest) {
  const u = req.nextUrl.clone();
  u.pathname = url;
  return u;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(req, res);

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  if (!session) {
    if (isAdminRoute || isDashboardRoute) {
      const loginUrl = redirectTo("/login", req);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  const userId = session.user.id;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = (profile as unknown as { role?: UserRole | null } | null | undefined)?.role ?? undefined;

  // Route gating
  if (isAdminRoute) {
    if (role === "admin") return res;
    const target = redirectTo("/dashboard", req);
    return NextResponse.redirect(target);
  }

  if (isDashboardRoute) {
    if (role === "client") return res;
    const target = redirectTo("/admin", req);
    return NextResponse.redirect(target);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/admin", "/dashboard/:path*", "/dashboard"],
};


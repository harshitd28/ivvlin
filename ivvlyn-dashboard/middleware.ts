import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import type { UserRole } from "@/lib/types";

const PUBLIC_PATHS = new Set(["/", "/agents", "/pricing", "/about", "/contact", "/login"]);
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/assets", "/opengraph-image", "/twitter-image"];

function withPath(req: NextRequest, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  return url;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next();

  const isPublicPath = PUBLIC_PATHS.has(pathname);
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  if (!isPublicPath && !isAdminRoute && !isDashboardRoute) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(req, res);
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    if (isAdminRoute || isDashboardRoute) {
      const loginUrl = withPath(req, "/login");
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile as unknown as { role?: UserRole | null } | null | undefined)?.role ?? undefined;

  if (pathname === "/login") {
    if (role === "admin") return NextResponse.redirect(withPath(req, "/admin"));
    if (role === "client") return NextResponse.redirect(withPath(req, "/dashboard"));
    return res;
  }

  if (!role) {
    return NextResponse.redirect(withPath(req, "/login"));
  }

  // Route gating
  if (isAdminRoute) {
    if (role === "admin") return res;
    return NextResponse.redirect(withPath(req, "/dashboard"));
  }

  if (isDashboardRoute) {
    if (role === "client") return res;
    return NextResponse.redirect(withPath(req, "/admin"));
  }

  return res;
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"],
};


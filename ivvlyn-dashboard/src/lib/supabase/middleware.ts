import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";
import type { NextRequest, NextResponse } from "next/server";

export function createSupabaseMiddlewareClient(
  req: NextRequest,
  res: NextResponse
): ReturnType<typeof createServerClient<Database>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies
          .getAll()
          .map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });
}


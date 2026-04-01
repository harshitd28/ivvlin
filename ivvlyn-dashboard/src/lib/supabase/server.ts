import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Still allows `next build` to succeed when env vars are not present.
  // Supabase queries will fail at runtime until env is configured.
}

export async function createSupabaseServerClient() {
  const validUrl =
    typeof supabaseUrl === "string" &&
    (supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://"));

  if (!validUrl || !supabaseAnonKey) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
      },
    },
  });
}


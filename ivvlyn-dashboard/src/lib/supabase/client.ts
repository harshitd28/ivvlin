"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isValidHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  return value.startsWith("http://") || value.startsWith("https://");
}

export function createSupabaseBrowserClient() {
  if (!isValidHttpUrl(supabaseUrl) || !supabaseAnonKey) return null;
  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey);
}


#!/usr/bin/env node
/**
 * Smoke-test Supabase connectivity using service role (reads one row from public.leads).
 * Loads ivvlyn-dashboard/.env.local — do not print secrets.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

function loadEnvLocal(file) {
  if (!fs.existsSync(file)) {
    console.error("Missing .env.local — copy from .env.local.example and add keys.");
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

const env = loadEnvLocal(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error, count } = await supabase.from("leads").select("*", { count: "exact", head: true });

if (error) {
  console.error("Supabase query failed:", error.message);
  process.exit(1);
}

console.log("OK — connected with service role. public.leads row estimate:", count ?? "unknown");

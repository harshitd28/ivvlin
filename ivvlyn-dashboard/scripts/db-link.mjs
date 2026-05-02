#!/usr/bin/env node
/**
 * Non-interactive `supabase link` using NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD in .env.local.
 * Database password: Supabase Dashboard → Project Settings → Database → Database password.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal(file) {
  const env = {};
  if (!fs.existsSync(file)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
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

function projectRefFromSupabaseUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

const root = path.join(__dirname, "..");
const env = loadEnvLocal(path.join(root, ".env.local"));
const ref = projectRefFromSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
const password = env.SUPABASE_DB_PASSWORD;

if (!ref) {
  console.error("Could not parse project ref from NEXT_PUBLIC_SUPABASE_URL (expected *.supabase.co).");
  process.exit(1);
}
if (!password) {
  console.error(
    "Add SUPABASE_DB_PASSWORD to .env.local (Database password from Supabase → Settings → Database), then rerun npm run db:link.",
  );
  process.exit(1);
}

execFileSync("npx", ["supabase", "link", "--project-ref", ref, "-p", password, "--yes"], {
  cwd: root,
  stdio: "inherit",
});
console.log("Linked. Next: npm run db:push (see docs/supabase-pending-work.md §0 if migrations were applied manually before).");

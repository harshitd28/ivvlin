#!/usr/bin/env node
/**
 * Run `supabase db push` with env from `.env.local` merged in (so `SUPABASE_DB_PASSWORD` is set).
 * The raw CLI does not load .env.local automatically.
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

const root = path.join(__dirname, "..");
const fileEnv = loadEnvLocal(path.join(root, ".env.local"));
const env = { ...process.env, ...fileEnv };

if (!fileEnv.SUPABASE_DB_PASSWORD) {
  console.error("Add SUPABASE_DB_PASSWORD to .env.local (Supabase → Settings → Database).");
  process.exit(1);
}

const pass = fileEnv.SUPABASE_DB_PASSWORD;
const extra = process.argv.slice(2);
if (!extra.includes("--yes")) extra.push("--yes");
/** CLI reads `SUPABASE_DB_PASSWORD`; also set `PGPASSWORD` for libpq without putting `-p` in argv. Do not set `PGUSER` — pooler uses `postgres.<project-ref>`. */
const childEnv = {
  ...env,
  SUPABASE_DB_PASSWORD: pass,
  PGPASSWORD: pass,
};
try {
  execFileSync("npx", ["supabase", "db", "push", ...extra], {
    cwd: root,
    stdio: "inherit",
    env: childEnv,
  });
} catch (e) {
  console.error(
    "db push failed. If not auth-related: fix migration SQL, run `npm run supabase:cli -- migration list`, or repair history per docs/supabase-pending-work.md §0.",
  );
  process.exit(e.status ?? 1);
}

#!/usr/bin/env node
/**
 * Run `npx supabase …` with `.env.local` merged (SUPABASE_DB_PASSWORD / PGPASSWORD).
 * Usage: npm run supabase:cli -- migration repair --status reverted VERSION ...
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
const pass = fileEnv.SUPABASE_DB_PASSWORD;
if (!pass) {
  console.error("SUPABASE_DB_PASSWORD required in .env.local");
  process.exit(1);
}
const env = {
  ...process.env,
  ...fileEnv,
  SUPABASE_DB_PASSWORD: pass,
  PGPASSWORD: pass,
};
const rest = process.argv.slice(2);
if (rest.length === 0) {
  console.error("Usage: npm run supabase:cli -- <supabase args>");
  process.exit(1);
}
execFileSync("npx", ["supabase", ...rest], { cwd: root, stdio: "inherit", env });

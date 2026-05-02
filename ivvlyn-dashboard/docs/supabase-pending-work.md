# Supabase rollout checklist (batch when ready)

**Production schema (applied CRM rollout):** see [`docs/supabase-rolled-out-schema.md`](./supabase-rolled-out-schema.md) for live column names and join rules. Repo migrations below are for greenfield / reference; production CRM messaging/inbox rollout is already applied.

Use this file as the checklist for **remaining** database and dashboard work (env, cron, workers, etc.). Update it when new migrations or cron jobs are added.

## 0. How we change the database (default)

1. **Add or edit** versioned SQL under `supabase/migrations/` in this repo (one logical change per file, timestamped name).
2. From `ivvlyn-dashboard/`, **link** the Supabase project once: `npx supabase link` (uses your Supabase project ref / DB password as prompted).
3. **Push** migrations: `npx supabase db push`.

That keeps Git and the remote database in sync. **Do not** use “paste this in the Supabase SQL editor” as the primary handoff for routine schema work unless it’s an intentional hotfix.

**Smoke-test connectivity (service role):** `npm run db:verify` (uses `.env.local`).

**Link non-interactively:** add **`SUPABASE_DB_PASSWORD`** to `.env.local`, then `npm run db:link`. Then `npm run db:push`.

**If SQL was applied manually before the CLI was linked**, `db push` may try to re-apply migrations and error (e.g. duplicate policy). Fix migration history on the remote: `npx supabase migration repair <version> --status applied` for each migration version already applied (see `npx supabase migration list` after linking). Example: `npx supabase migration repair 20260507120000 --status applied`.

**Orphan remote migration versions** (versions on the server but not in `supabase/migrations/`): CLI suggests `migration repair --status reverted <version>…` then `db push`. From repo: `npm run supabase:cli -- migration repair --status reverted VERSION …`

**`password authentication failed` on `db push`:** the value in **`SUPABASE_DB_PASSWORD`** must be **exactly** the **Database password** from Supabase → **Project Settings → Database** (use **Reset database password** if unsure, then update `.env.local`). No quotes unless the password itself contains spaces; if it contains `#`, put the value in double quotes in `.env.local`. Special characters are fine if the line is a single `KEY=value` with no unescaped line breaks.

**`db push` uses the connection pooler** by default (IPv4-friendly). Avoid ad‑hoc `--skip-pooler` **link** on networks without IPv6 to the direct DB host, or you may see `IPv6 is not supported` / connection refused.

---

## 1. Migrations (apply in this order)

| Order | File | What it does |
|------:|------|----------------|
| 1 | `supabase/migrations/20260501120000_messaging_backbone.sql` | Conversation lifecycle, `webhook_idempotency`, `outbound_message_jobs` |
| 2 | `supabase/migrations/20260502120000_team_inbox_and_queue_scale.sql` | Team inbox columns on `leads`, `inbox_notes`, job `priority` |
| 3 | `supabase/migrations/20260503120000_inbox_presence.sql` | `profiles.inbox_last_seen_at` for lightweight agent presence |
| 4 | `supabase/migrations/20260504120000_campaigns_mvp.sql` | `campaigns` table for broadcasts (fan-out to outbound queue) |
| 5 | `supabase/migrations/20260505120000_campaigns_whatsapp_templates.sql` | `send_kind`, `template_name`, `template_language`, `template_body_params` on `campaigns` |
| 6 | `supabase/migrations/20260507120000_rls_tenant_scoping.sql` | **RLS:** core tables — tenant-scoped `authenticated` policies (`profiles.role = admin` → all rows; else `client_id` match) |
| 7 | `supabase/migrations/20260508200000_rls_visits_credit_logs.sql` | **RLS (conditional):** only if `public.visits` / `public.credit_logs` exist — same tenant pattern |

Additional files in `supabase/migrations/` after these (e.g. messaging observability, template preset columns, worker column alignment, **`campaigns.template_extras`**, **`audit_events`**) should be applied with the same **`npx supabase db push`** workflow so the database matches the app.

**How to apply**

- **Preferred:** §0 — `npx supabase link` (once per machine), then `npx supabase db push`.
- **Fallback:** Supabase Dashboard → SQL → run files in order (e.g. hotfix or CI without CLI).

**Reference only:** `supabase/schema.sql` mirrors the intended contract; it is not meant to be executed as a full migrate on an existing DB.

## 2. Supabase dashboard (manual)

- **Auth:** Ensure email/provider you use for dashboard sign-in is enabled.
- **Realtime:** Enable replication for tables the app subscribes to (at least `public.conversations`). If `leads` realtime is added later, enable it then.
- **Webhooks (Meta):** Point WhatsApp callback to `https://<your-domain>/api/webhooks/meta` with verify token env.

## 3. Environment variables (app + workers)

Already documented in `docs/enterprise-parity-matrix.md`. Minimum for messaging:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server + `worker:outbound` + internal cron routes)
- `META_*`, `CRON_SECRET`, optional `REDIS_URL`
- `CAMPAIGN_MAX_RECIPIENTS` (optional, default `2000`) — cap audience size per campaign send

## 4. Cron / scheduled jobs (after deploy)

Set **`CRON_SECRET`** on the host (≥16 chars). Call with `Authorization: Bearer <CRON_SECRET>`.

**Recommended** (`GET` + `POST`, Vercel Cron–friendly): [`cron-examples.md`](./cron-examples.md)

| Endpoint | Purpose | Suggested interval |
|----------|---------|--------------------|
| `GET`/`POST` **`/api/cron/queue`** (legacy: `POST /api/internal/messaging/process-queue`) | Drain outbound jobs (Postgres + optional Redis) | 15–60s |
| `GET`/`POST` **`/api/cron/sla`** (legacy: `POST /api/internal/inbox/sla-sweep`) | Set `sla_breached_at` when due | 1–5 min |
| `GET`/`POST` **`/api/cron/campaigns`** (legacy: `POST …/dispatch-scheduled`) | Launch due scheduled campaigns | 1–5 min |
| `GET`/`POST` **`/api/cron/all`** | Queue → SLA → campaigns in **one** request | 15–60 min |

Optional body (POST): process-queue `{ "maxJobs": 40 }`, dispatch-scheduled `{ "max": 10 }`.

Vercel: add **`CRON_SECRET`** to project env — platform sends **`Authorization: Bearer`** automatically. Example `crons` merge: [`vercel-crons-pro.example.json`](./vercel-crons-pro.example.json) (**Hobby**: ≤1 cron/day — use GitHub Actions `curl` or upgrade).

## 5. Row Level Security

**Migration:** `supabase/migrations/20260507120000_rls_tenant_scoping.sql` — **applied in production** (can also be applied via §0 on other environments).

**Verified** (`pg_class.relrowsecurity = true` / row security on): `activities`, `clients`, `conversations`, `inbox_notes`, `leads`, `profiles`. The migration file also includes **`campaigns`** and optional notes for **`credit_logs`** / **`visits`** if those tables exist in a given project.

Service-role callers **bypass** RLS.

Ongoing checks:

- Authenticated users can **`update` only their own** `profiles` row (presence heartbeat).
- Client dashboards load inbox/leads; admin `/admin` still sees cross-tenant data (`profiles.role = 'admin'`).

## 6. Verification after migrate

Run in SQL editor (adjust `client_id` / `lead_id`):

```sql
-- Jobs pending
select count(*) from public.outbound_message_jobs where state = 'pending';

-- SLA fields present
select lead_id, first_response_due_at, sla_breached_at, assigned_to_user_id
from public.leads
limit 5;

-- Presence column
select id, full_name, inbox_last_seen_at from public.profiles limit 5;

-- Campaigns
select id, name, state, stats_enqueued from public.campaigns order by created_at desc limit 5;
```

## 7. Changelog (keep updated)

| Date (UTC) | Change |
|------------|--------|
| 2026-05-03 | **`/api/cron/*`** GET+POST (queue, sla, campaigns, **`all`**); shared handlers + `CRON_SECRET`; docs [`cron-examples.md`](./cron-examples.md), [`vercel-crons-pro.example.json`](./vercel-crons-pro.example.json). |
| 2026-05-02 | RLS applied manually (see §5). Supabase CLI in repo; **`npm run db:verify`**, **`npm run db:link`** (+ `SUPABASE_DB_PASSWORD`), **`npm run db:push`**; `.env.local.example`; migration **`20260508200000_rls_visits_credit_logs.sql`** for optional `visits` / `credit_logs`. |
| 2026-05-01 | **`project_status.md`** (was messaging roadmap doc); **`cron-examples.md`**; RLS migration **`20260507120000_rls_tenant_scoping.sql`**. |
| 2026-05-01 | Initial checklist: backbone + team inbox + presence migration + SLA sweep route. |
| 2026-05-01 | Inbox queue filters (`?filter=unassigned|mine`), `POST /api/inbox/presence`, migration `20260503120000_inbox_presence.sql`. |
| 2026-05-01 | Campaigns MVP: migration `20260504120000_campaigns_mvp.sql`, `/api/campaigns`, `/api/internal/campaigns/dispatch-scheduled`, dashboard `/dashboard/campaigns`. |
| 2026-05-01 | WhatsApp template campaigns: migration `20260505120000_campaigns_whatsapp_templates.sql`, worker sends Graph `type: template` when job payload has `whatsapp_kind: template`. |

When you add a new migration or cron, append a row here and add the file to section 1.

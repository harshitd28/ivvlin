# Ivvlyn CRM messaging & inbox — project status (handbook)

This document is the **onboarding source of truth** for engineers: what is **shipped in code and schema**, how the **backend is laid out**, and what is **intentionally left** for the next builder. For column-level DB contracts see [`supabase-rolled-out-schema.md`](./supabase-rolled-out-schema.md). For CLI and cron checklists see [`supabase-pending-work.md`](./supabase-pending-work.md). For product positioning vs Interakt/WATI see [`enterprise-parity-matrix.md`](./enterprise-parity-matrix.md).

**Product direction:** WhatsApp Business Platform (Meta Cloud API) as the spine — not “CRM mirror only”. Dual inbound (**Meta webhook** and **workflow forward**), dashboard-owned **outbound queue**, **takeover/handback**, **templates** outside the 24h window. Architecture narrative: [`whatsapp-platform-architecture-audit.md`](./whatsapp-platform-architecture-audit.md).

---

## Teammate read order

1. This file (inventory + backlog).
2. [`supabase-rolled-out-schema.md`](./supabase-rolled-out-schema.md) (join rules and tables).
3. [`n8n-whatsapp-forward.md`](./n8n-whatsapp-forward.md) if automation owns the Meta webhook.
4. [`cron-examples.md`](./cron-examples.md) for production scheduling.

---

## Database — last applied migrations (repo → remote)

From this repo, **`npm run db:push`** (uses `.env.local` + `SUPABASE_DB_PASSWORD`) applies versioned SQL under `supabase/migrations/`. **Your teammate must run the same** on any new Supabase project or after pulling new migration files.

**Recently added (ensure applied everywhere):**

| Migration | Purpose |
|-----------|---------|
| `20260514120000_campaigns_template_extras.sql` | `campaigns.template_extras` jsonb — rich template header/media/buttons for broadcasts |
| `20260515120000_audit_events.sql` | `audit_events` + RLS (tenant + admin read) |

**Full set:** All timestamped files in `supabase/migrations/` should be applied in order on greenfield; on existing production DBs use `db push` or repair per [`supabase-pending-work.md`](./supabase-pending-work.md) §0.

---

## 1. What we have built — database (Supabase)

| Area | Notes |
|------|--------|
| **CRM core preserved** | `conversations`, `messages` not dropped; different join rules (see schema doc). |
| **`conversations`** | Inbox/thread row model: `client_id`, `conversation_status`, assignment, phones, Meta ids in `metadata`, `timestamp` / `content`, Realtime publication. |
| **`leads`** | Team inbox + SLA columns, `mode` (ai/human), scoring, assignment. |
| **`activities`** | Timeline; `timestamp` vs `created_at` handling in app. |
| **`clients`**, **`profiles`** | Tenancy + roles (`admin` \| `client`); `inbox_last_seen_at` for presence. |
| **`webhook_idempotency`** | Unique `(provider, event_id)` — Meta + internal ingest + takeover handler. |
| **`outbound_message_jobs`** | Postgres-backed outbound queue: states, retries, `scheduled_at`, template fields, `payload` jsonb, `error` / `last_error`, provider message ids. |
| **`campaigns`** | Broadcast MVP: audience json, schedule, stats, `send_kind` + template fields + **`template_extras`**. |
| **`wa_template_presets`** | Per-tenant template composer presets (RLS). |
| **`webhook_delivery_events`** | Skips/errors from Meta path; nullable `client_id` for orphan events; admin visibility. |
| **`audit_events`** | Sensitive action log (API inserts via service role); RLS select for admin + tenant. |
| **`inbox_notes`** | Internal notes on leads/threads. |
| **`visits`** | Site visits (where table exists); conditional RLS migration. |
| **RLS** | Core tenant scoping + admin bypass via `ivv_current_is_admin()` — see `20260507120000_rls_tenant_scoping.sql`. Service role used by webhooks/workers bypasses RLS. |

---

## 2. What we have built — backend (Next.js App Router)

### 2.1 WhatsApp inbound & observability

| Route | Role |
|-------|------|
| `GET` / `POST` **`/api/webhooks/meta`** | Webhook verify, signature check, idempotency, inbound message + status handling, **`webhook_delivery_events`** on skips/errors, optional **per-IP rate limit** when `REDIS_URL` is set (`META_WEBHOOK_RATE_PER_MIN`). |
| **`POST` `/api/internal/ingest/whatsapp`** | Bearer **`INTERNAL_INGEST_SECRET`** — same dedupe keys as Meta path for n8n-forwarded events. |

### 2.2 Outbound & queue

| Route / script | Role |
|----------------|------|
| **`POST` `/api/messaging/outbound/enqueue`** | Enqueue jobs; **24h session** check for human plain text (`whatsapp_session_expired`); templates allowed. |
| **`POST` `/api/internal/messaging/process-queue`** | Drain jobs (Bearer **`CRON_SECRET`** or legacy patterns). |
| **`npm run worker:outbound`** | Long-running worker (`scripts/outbound-worker.ts`) — optional vs cron. |
| Redis | Optional **LPUSH/RPOP** fast-lane for job ids when `REDIS_URL` is set. |

**Libraries (non-exhaustive):** `src/lib/messaging/enqueue-internal.ts`, `dispatch-batch.ts`, `whatsapp-send-plan.ts`, `meta-webhook.ts`, `inbound-customer-message.ts`, `webhook-delivery-log.ts`, `redis-queue.ts`.

### 2.3 Inbox APIs (tenant-authenticated)

| Route | Role |
|-------|------|
| **`PATCH` `/api/inbox/leads`** | Assignee, pin (`inbox_status`), **`mode`** + takeover timestamps; **audit** on success. |
| **`PATCH` `/api/inbox/thread-status`** | Resolve/reopen latest conversation row. |
| **`GET` `/api/inbox/messaging-insights`** | Queue counts, lag, recent non-sent errors, dead samples, **24h** `webhook_delivery_events`. |
| **`GET` `/api/inbox/queue-counts`** | Counts-only snapshot. |
| **`GET` / **`POST` `/api/inbox/dead-jobs`** | List dead jobs; **requeue** (resets + Redis push); **audit** on requeue. |
| **`GET` / **`POST` / **`DELETE` `/api/inbox/wa-template-presets`** | Presets CRUD. |
| **`GET` / **`POST` `/api/inbox/notes`** | Notes. |
| **`POST` `/api/inbox/lock`** | **No-op today** (returns success) — rolled schema has no lock columns; real collision control is backlog. |
| **`POST` `/api/inbox/presence`** | Updates **`profiles.inbox_last_seen_at`** (agent heartbeat). |

### 2.4 Campaigns

| Route | Role |
|-------|------|
| **`GET` / **`POST` `/api/campaigns`** | List/create; template + **`template_extras`**; **`send_now`** path calls launch + **audit**. |
| **`POST` `/api/campaigns/[id]/launch`** | Fan-out to queue + **audit**. |
| **`POST` `/api/internal/campaigns/dispatch-scheduled`** | Cron: scheduled campaigns. |

**Library:** `src/lib/campaigns/launch.ts`, `audience.ts`.

### 2.5 Cron (Vercel-friendly)

| Route | Role |
|-------|------|
| **`/api/cron/queue`**, **`/api/cron/sla`**, **`/api/cron/campaigns`**, **`/api/cron/all`** | Bearer **`CRON_SECRET`**; chain queue + SLA + campaigns. |

Legacy aliases still exist under **`/api/internal/*`** where noted in code.

### 2.6 Admin APIs (admin role)

| Route | Role |
|-------|------|
| **`/api/admin/leads/export`**, **`bulk-mode`**, **`set-mode`** | Ops on leads. |
| **`/api/admin/clients/create`** | Create client. |
| **`/api/admin/credits/logs/export`** | Credits export. |
| **`GET` `/api/admin/webhook-events`** | JSON export of **`webhook_delivery_events`** (`scope=orphan|all`, `limit`). |

### 2.7 Automation takeover webhook (public, secret optional)

| Route | Role |
|-------|------|
| **`POST` `/webhook/takeover-handler`** | Idempotent **`mode`** / assignment updates for n8n; optional **`WEBHOOK_SHARED_SECRET`**. |

### 2.8 Audit (server-side)

| Mechanism | Role |
|-----------|------|
| **`recordAuditEvent`** (`src/lib/audit/record-audit.ts`) | Service-role insert into **`audit_events`** on lead patch, campaign launch/send-now, dead-job requeue. |

### 2.9 Misc

| Area | Notes |
|------|--------|
| **`POST` `/api/contact`** | Marketing contact. |
| **`/api/test/*`** | Sandbox test routes (WhatsApp/Meta/MSG91) — do not expose in production without review. |

---

## 3. What we have built — dashboard UI (client portal)

| Surface | Notes |
|---------|--------|
| **Dashboard home** | Client stats; may use real outbound counts when service role + tenant available. |
| **Leads** | List, filters, lead detail with merged **activities + conversations** timeline. |
| **Inbox** | **`/dashboard/conversations`** — filters (open, resolved, unread, pinned, human, automation, mine, unassigned), thread, notes, template composer (presets, headers, buttons), session UX, messaging insights banner, link to **Messaging ops**. |
| **Campaigns** | **`/dashboard/campaigns`** — create text/template, schedule, send now, **template_extras** JSON, **analytics summary** strip for completed runs. |
| **Messaging ops** | **`/dashboard/messaging`** — Recharts (queue mix, webhook outcomes), DLQ table, requeue, insights tables. |
| **Automation** | **`/dashboard/automation`** — integration runbook (ingest, takeover, cron). |
| **Visits** | Calendar + table where **`visits`** exists. |
| **Analytics / settings** | As implemented in repo (some marketing/mock layers may coexist). |

**Layout:** Sidebar, shell components, credit bar, etc., under `src/components/layout/` and `src/components/dashboard/`.

---

## 4. What we have built — admin UI

| Surface | Notes |
|---------|--------|
| **`/admin`** | Global overview + **per-client overview** when **`?clientId=`** is set (stats, links, recent campaigns). |
| **`/admin/clients`**, **`/admin/leads`** | Management + export; leads support **`clientId`** filter. |
| **`/admin/conversations`** | Cross-tenant **conversations** log with optional client filter. |
| **`/admin/visits`** | Cross-tenant visits + calendar + filters. |
| **`/admin/webhooks`** | Orphan vs all **`webhook_delivery_events`**. |
| **`/admin/credits`**, **`/admin/settings`** | Credits; settings shows **env readiness** (set/missing only), runbook links, **recent audit** table. |

Admin nav includes **Conversations**, **Visits**, **Webhooks**, etc.

---

## 5. Environment variables (reference)

Documented in [`enterprise-parity-matrix.md`](./enterprise-parity-matrix.md) and [`.env.local.example`](../.env.local.example). Critical groups: **Supabase** (URL, anon, **service role**, **`SUPABASE_DB_PASSWORD`** for CLI), **Meta** (`META_VERIFY_TOKEN`, `META_APP_SECRET`), **cron** (`CRON_SECRET`), **ingest** (`INTERNAL_INGEST_SECRET`), optional **Redis** (`REDIS_URL`, **`META_WEBHOOK_RATE_PER_MIN`**), **takeover** (`WEBHOOK_SHARED_SECRET`), dev-only **`WHATSAPP_SKIP_SESSION_WINDOW`**.

---

## 6. What is left — backlog for your teammate (build next)

Work below is **not fully shipped** or is **intentionally external**; prioritize by your first customer’s SLA.

### 6.1 High impact / platform

| Item | Why |
|------|-----|
| **Persistent thread lock** | **`POST` `/api/inbox/lock`** is a no-op. Add a lock table (or columns), enforce in API, show lock state in **`ConversationThread`**, expire stale locks. |
| **Cron + worker in every environment** | Code exists; ensure **Vercel Cron** (or GitHub Actions `curl`) + **`CRON_SECRET`** + optional **`worker:outbound`** are actually running so **pending** drains and **SLA** / **scheduled campaigns** advance. |
| **n8n respects `leads.mode`** | Dashboard and DB update **`mode`**; automation must **branch** or workflows keep replying — document and verify in customer n8n graphs. |
| **Historical observability** | Today: snapshots + 24h webhook rows. **Time-series** (queue depth, send %, error rate) needs metrics store or warehouse + charts. |
| **Alerting** | No PagerDuty/Slack integration; add webhook on threshold (e.g. dead job count, lag &gt; N minutes) or export to Datadog. |

### 6.2 Product parity (enterprise)

| Item | Why |
|------|-----|
| **In-app automation / journeys** | **`/dashboard/automation`** is documentation-level; no visual rule engine or event bus in-app. |
| **Campaign analytics depth** | Summary strip uses **campaign stats** only; no per-recipient funnel, Meta delivery/read receipts rolled up, or export. |
| **Billing** | Stripe / metering UI not built; admin mentions billing as external. |
| **Rate limits (general API)** | Meta webhook has optional Redis limiter; **tenant-level** or **per-user** API limits not systematic. |
| **`messages` vs `conversations`** | Two message stores — see [`messages-vs-conversations.md`](./messages-vs-conversations.md); consolidation or clear “source of truth” per feature is open. |

### 6.3 Hardening & compliance

| Item | Why |
|------|-----|
| **Audit coverage** | Audit today: leads patch, campaign launch/send-now, requeue. Extend to **template preset** changes, **admin** bulk actions, **settings** changes if you add persisted settings. |
| **Secret management UI** | Admin settings **does not** store Meta/Claude keys — by design; if product needs per-tenant tokens in DB, add encrypted columns + rotation story. |
| **RLS regression tests** | Policies evolve; add automated checks that **client A** cannot read **client B** rows. |

### 6.4 Polish & tech debt

| Item | Why |
|------|-----|
| **Sidebar / nav** | Remove stale badges (e.g. hardcoded inbox badge) and align **Analytics vs CRM Sync** destinations if duplicated. |
| **Test routes** | **`/api/test/*`** should be disabled or guarded in production builds. |
| **OG / sitemap** | See code TODOs in marketing/SEO if public site matters. |

---

## 7. Changelog discipline

When you ship a milestone (RLS on a new table, new cron, major API), add a **dated line** under [`supabase-pending-work.md`](./supabase-pending-work.md) changelog if that file maintains one, and bump this doc’s **Database — last applied** section when migrations land.

---

*Last updated: handbook refresh with inventory of shipped backend/UI/admin/audit/rate-limit/campaign extras (2026).*

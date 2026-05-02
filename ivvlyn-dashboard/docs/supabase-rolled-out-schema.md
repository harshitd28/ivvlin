# Supabase schema — production rollout (CRM messaging / inbox)

This document is the **source of truth** for the database shape after CRM rollout. Repo migrations under `supabase/migrations/` may differ; **align app code with this document** when they conflict.

## Preserved tables

- **`public.conversations`** — message / conversation log (not recreated).
- **`public.messages`** — left untouched; `messages.lead_id` is **uuid** (join to `leads.id`).
- **`public.leads`** — `leads.id` uuid, `leads.lead_id` text (business key).

## Join rules (critical)

| From | To | Join on |
|------|-----|---------|
| `conversations` | `leads` | **`conversations.lead_id` = `leads.lead_id`** (both use business `lead_id` as text on the conversation side) |
| `messages` | `leads` | **`messages.lead_id` = `leads.id`** (uuid) |

Do not assume `conversations.lead_id` equals `leads.id`.

## `public.activities`

Production has both **`timestamp`** and **`created_at`**. Compatibility SQL may install **`sync_activities_timestamp_trigger`** so the two stay aligned; **`timestamp` remains the canonical field** for app ordering when present.

The dashboard uses **`activityOccurredAt()`** (`timestamp` → else `created_at`) so legacy or edge rows still render.

## `public.conversations` (inbox / realtime)

Columns include (non-exhaustive):

- `id`, `lead_id` (text), `channel`, `direction`, `sender`, `content`, `timestamp`, `metadata` (jsonb), `client_id`
- `conversation_status` (default `'open'`)
- `assigned_to_user_id`, `contact_phone`, `external_conversation_id`
- `last_message_at`, `resolved_at`, `updated_at`

Realtime publication includes: `id`, `lead_id`, `channel`, `direction`, `sender`, `content`, `timestamp`, `metadata`, `client_id`, `conversation_status`, `assigned_to_user_id`, `contact_phone`, `external_conversation_id`, `last_message_at`, `resolved_at`, `updated_at`.

**App conventions:**

- Store WhatsApp Cloud API message id in **`metadata.whatsapp_message_id`** for receipt/status correlation.
- Optional: `metadata.is_automated`, `metadata.idempotency_key`, `metadata.queue_status`, template hints for outbound.

## `public.webhook_idempotency`

- `provider`, `event_id`, `payload`, `processed_at`, `created_at`
- **Unique** `(provider, event_id)`

## `public.webhook_delivery_events`

Optional ops visibility: `client_id` (nullable for unknown WABA), `source`, `event_kind`, `outcome` (`ok` \| `skipped` \| `error`), `error_message`, `detail` (jsonb). Written by Meta webhook handler for skips (unknown phone id, no lead) and handler errors. **RLS:** tenant read + admin; inserts via **service role**.

**Programmatic export (admins):** `GET /api/admin/webhook-events?scope=orphan|all&limit=…` returns JSON (session cookie or bearer as for other dashboard APIs).

## `public.campaigns`

Audience fan-out into `outbound_message_jobs` (see `launch.ts`). Includes `send_kind` (`text` \| `template`), `template_name`, `template_language`, `template_body_params` (jsonb), and **`template_extras` (jsonb, default `{}`)** — optional rich WhatsApp template fields aligned with the inbox composer / `whatsapp-send-plan`: e.g. `template_header_params`, `template_header_media_kind` / `template_header_media_url` / `template_header_document_filename`, `template_buttons`. Merged into each enqueued job’s payload when `send_kind = template`.

## `public.audit_events`

Append-only audit rows: `actor_user_id` → `profiles`, optional `client_id`, `action`, `resource_type`, `resource_id`, `detail` (jsonb). Inserted from API routes via **service role**; **RLS** allows select for admins (all rows) and tenant users (`client_id` match).

## `public.wa_template_presets`

Team-wide WhatsApp template composer presets per `client_id`: labels, `template_name` / language, body lines, optional header (text or media URL fields), URL-button index/suffix, etc. **RLS:** same tenant pattern as campaigns/leads-style tables.

## `public.outbound_message_jobs`

Includes: `client_id`, `lead_id`, `conversation_id`, `channel`, `to_phone`, `template_name`, `template_language`, `message_type`, `payload` (jsonb), `state`, `priority`, `attempts`, `max_attempts`, `scheduled_at`, `locked_at`, `locked_by`, `sent_at`, `failed_at`, **`error`** and **`last_error`** (worker keeps both in sync where present), **`external_message_id`** and **`provider_message_id`** (worker keeps both on send success where present), `created_at`, `updated_at`.

Worker uses **`scheduled_at`** (not `next_attempt_at`) for due polling where applicable.

## `public.leads` (team inbox / SLA)

Includes: `assigned_to_user_id`, `inbox_status` (default `'open'`), `first_response_due_at`, `sla_breached_at`, `last_customer_message_at`, `last_agent_response_at`.

**Star / pin:** UI maps “starred” to **`inbox_status = 'pinned'`** (convention).

## `public.inbox_notes`

- `author_user_id` (not `author_id`), optional `conversation_id`, `is_internal` default true, `body`, `client_id`, `lead_id`, timestamps.

## `public.profiles`

- `inbox_last_seen_at` for presence heartbeat.

## `public.team_members`

Exists for staff/team records (use for future RBAC / assignment sources).

## Pending

- **RLS** — tenant policies from `supabase/migrations/20260507120000_rls_tenant_scoping.sql` **applied** (verify policies per environment). Further schema changes: repo migrations + `npx supabase db push` (see `docs/supabase-pending-work.md` §0).
- **Env / ops:** Meta webhook URL, `CRON_SECRET`, queue worker, SLA sweep cron (see `docs/supabase-pending-work.md`).

---

*Pasted rollout summary (2026): CRM tables preserved; conversations extended; webhook dedupe; outbound queue; leads SLA/inbox; inbox_notes; profiles presence; Realtime on conversations.*

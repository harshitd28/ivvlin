# WhatsApp business platform — product direction vs implementation audit

**Goal:** A full **WhatsApp-style business messaging workspace** (Interakt/WATI direction) on Meta WhatsApp Cloud API—not only a CRM mirror—with automation coexistence (**n8n may remain primary webhook**).

---

## 1. What already exists

### Inbound & processing

| Area | Status |
|------|--------|
| **Direct Meta webhook** | `GET/POST /api/webhooks/meta` — verify token, optional `X-Hub-Signature-256`, idempotency (`webhook_idempotency`), inbound text → `conversations` row, status callbacks → `metadata` via `mergeConversationMetadata` |
| **Client resolution** | Inbound matches `clients.whatsapp_phone_id` → `phone_number_id` |
| **Lead resolution** | Matches customer digits to `leads.phone` / `lead_id` |
| **Dedupe** | WhatsApp message id in metadata; duplicate webhook events skipped |
| **SLA touch** | Updates `leads` SLA fields on inbound (e.g. `first_response_due_at`, customer message timestamps per rollout) |

### Outbound & queue

| Area | Status |
|------|--------|
| **Agent send path** | `POST /api/messaging/outbound/enqueue` → queued `conversations` row + `outbound_message_jobs` + optional Redis hint |
| **Worker / cron drain** | `dispatch-batch.ts` — WhatsApp **text** + **template** sends via Graph API; merges delivery metadata back |
| **Cron surface** | `GET/POST /api/cron/{queue,sla,campaigns,all}` + legacy `/api/internal/*` — `CRON_SECRET`, Vercel-compatible GET |
| **Campaigns** | `/api/campaigns`, launch, template fields, fan-out to queue |

### Data & security

| Area | Status |
|------|--------|
| **`conversations`** | Rolled-out inbox columns; realtime publication |
| **Join discipline** | Documented: `conversations.lead_id` ↔ `leads.lead_id`; `messages.lead_id` ↔ `leads.id` |
| **RLS** | Tenant policies on core tables; service role for workers/webhooks |
| **`profiles` presence** | `inbox_last_seen_at` + heartbeat API |

### UI (inbox)

| Area | Status |
|------|--------|
| **Conversation list + thread** | `/dashboard/conversations` — list, channel tabs, queue filters **all / unassigned / mine**, search by name/preview |
| **Realtime thread** | Supabase realtime on `conversations` |
| **Team panel + notes** | Notes APIs; assignment/star (`inbox_status` pinned) patterns |
| **Lead detail** | Timeline = `activities` + `conversations`; SLA/inbox fields surfaced |
| **Campaigns UI** | Dashboard campaigns client |
| **Takeover (partial)** | Lead detail + ConversationThread use **`mode` ai/human**; `LeadDetailClient` updates `leads.mode`; webhook relay `/webhook/takeover-handler` exists |

### Automation hook (minimal)

| Area | Status |
|------|--------|
| **takeover-handler** | POST JSON with `lead_id` + `mode` (`ai` \| `human`); optional secret + idempotency; **persists** `takeover_at` / `handback_at` and optional `assigned_to` / `assigned_to_user_id` on `leads` |

---

## 2. What is missing (gaps vs stated direction)

### Inbound architecture

| Gap | Notes |
|-----|------|
| **Forwarded ingest operationalization** | **`POST /api/internal/ingest/whatsapp`** + runbook [`n8n-whatsapp-forward.md`](./n8n-whatsapp-forward.md). Monitor **401** (secret), **404** (unknown lead / phone). |
| **Primary webhook ≠ dashboard** | Meta **direct** webhook remains **`/api/webhooks/meta`** for tenants that point Meta here; **n8n-first** tenants must **forward** inbound + statuses to the ingest route—cannot rely on dashboard receiving Meta callbacks. |
| **Status forwarding from n8n** | Supported via `{ "event": "status", … }` on the same ingest route; wire n8n to forward WhatsApp status payloads. |

### Takeover / automation contract

| Gap | Notes |
|-----|------|
| **`vaani_managed` not modeled** | Repo uses **`mode` (`ai` \| `human`)** + optional **`takeover_at` / `handback_at`** in schema/admin bulk—not **`vaani_managed` boolean**. Naming sync + single source of truth needed. |
| **Conversation-level “human controlled”** | Takeover updates **`leads.mode`**; inbound + outbound **`conversations.metadata`** includes **`lead_mode`** and **`human_takeover_active`** for automation branching / analytics. |
| **“Automation stops when human owns chat”** | **Not enforceable in dashboard alone**—requires **n8n/workflows** to branch on HTTP lookup or shared DB flags after webhook/API updates. |

### WhatsApp-like UX

| Gap | Notes |
|-----|------|
| **Filters** | **Unread / open / resolved / pinned** implemented via URL `filter=` + team panel resolve/reopen; deep search still limited to list preview. |
| **Read receipts in UI** | Metadata supports delivery/status; thread UI not fully **WhatsApp-parity** (read ticks, grouped media). |
| **Search** | Name/preview only—no full-history search. |
| **Contact details panel** | Partial (team panel); no consolidated **contact card** (WA profile fields, tags). |
| **Media** | Meta webhook maps non-text to `[type]` placeholder; upload/send paths partial vs full MIME handling. |
| **Template UX from inbox** | **Expandable template composer** in thread (name, language, body variables); presets / multi-component templates still roadmap. |

### Business rules (Meta)

| Gap | Notes |
|-----|------|
| **24-hour customer care window** | Human plain-text **`enqueue`** rejected outside window (**422**); template path + inbox composer; automation text unchanged. |
| **`messages` vs `conversations`** | Documented in [`messages-vs-conversations.md`](./messages-vs-conversations.md) — canonical thread is **`conversations`** for this inbox. |

### Profile / DP

| Gap | Notes |
|-----|------|
| **No `lead` avatar URL column** in rolled-out doc | Need nullable **`avatar_url`** / **`wa_profile_name`** (and optional `profile_metadata jsonb`) for future enrichment—not yet required fields in migrations shipped here. |

---

## 3. Database changes still required (suggested)

Use **`supabase/migrations/` + `db push`** per [`supabase-pending-work.md`](./supabase-pending-work.md) §0.

| Change | Purpose |
|--------|---------|
| **`leads`** | Add **`vaani_managed`** `boolean default true` **or** formally adopt **`mode` + `takeover_at`/`handback_at`** only—pick one model and deprecate the other in docs. Optional **`last_customer_message_at`** already in rollout for CS window. |
| **`leads` or `clients`** | **`customer_care_window_expires_at`** optional cache (derive from last inbound user message + 24h if needed). |
| **`conversations`** | Ensure **`metadata`** schema documents **source**: `meta_webhook` \| `n8n_forward` \| `dashboard` for debugging. |
| **Contact presentation** | **`leads.avatar_url`**, **`leads.wa_display_name`** (nullable)—populate only when source allows (see §6). |
| **Unified history** (optional) | Either migrate thread reads to **`messages`** + **`conversations`** view, or document single source = **`conversations`** only and deprecate duplicate writes to `messages`. |

---

## 4. API routes required (recommended)

| Route | Role |
|-------|------|
| **`POST /api/internal/ingest/whatsapp`** | **Bearer `INTERNAL_INGEST_SECRET`** — JSON body for forwarded messages or `{ "event": "status", … }` for delivery/read updates. Implemented at [`src/app/api/internal/ingest/whatsapp/route.ts`](../src/app/api/internal/ingest/whatsapp/route.ts); shares idempotency keys with Meta webhook. |
| **`PATCH /api/inbox/leads/takeover`** (extend existing [`inbox/leads`](./supabase-pending-work.md)) | Atomic: `vaani_managed`/`mode`, `takeover_at`, `assigned_to_user_id`, `conversation_status`. |
| **`POST /webhook/takeover-handler`** | **Persist** state (today: echo only)—or deprecate in favor of PATCH above. |
| **Outbound** | Extend enqueue body with **`whatsapp_kind`**: `session_text` \| `template` + template fields; **server validates** session vs template using **`last_customer_message_at`** / window rules. |

---

## 5. UI screens / components required

| Item | Direction |
|------|-----------|
| **Inbox shell** | Three-column layout: **list \| thread \| contact & SLAs & notes** (Interakt-like). |
| **Filter chips** | Unread (needs signal), Open/Resolved, Assigned to me, All. |
| **Thread** | Bubble styles, status ticks (from metadata), media thumbnails, template bubbles. |
| **Composer** | Session **free-form** vs **template picker** when outside 24h or new thread. |
| **Contact header** | Avatar (initials fallback), verified display name, phone, assignee, tags. |
| **Takeover control** | Explicit **Take over / Hand back** tied to API—surface **`vaani_managed`** state to user. |

---

## 6. Meta API limitations (especially DP & cold outreach)

| Topic | Reality |
|-------|---------|
| **Customer profile photo (DP)** | **WhatsApp Cloud API does not expose** a supported Graph endpoint to fetch arbitrary customers’ profile pictures (same limitation discussed publicly by platform vendors). **Do not fake URLs.** Use **initials / generated avatar**; store **`avatar_url`** only if you later get a URL from an allowed channel (e.g. your own uploaded asset, or a future Meta feature). |
| **Profile name** | Webhook **may** include limited fields depending on payload/type; **Contact / profile sync** APIs evolve—verify current Graph docs for **`whatsapp_business_profile`** vs **user** profile—typically **business** profile is yours, not the customer’s. Prefer **`contacts` webhook / profile name** when Meta sends it; otherwise display **`leads.name`** / phone. |
| **New numbers / outside 24h session** | Must use **pre-approved templates** (category rules: marketing vs utility vs authentication). **Free-form text** only inside **customer care session** (generally **24 hours from last user message** in that thread—confirm latest Meta policy text). |
| ** throughput / tiers** | Sending limits and phone quality rating affect deliverability—operational, not app-only. |

---

## 7. Phased implementation plan (preserve n8n automation)

### Phase A — Contracts without breaking n8n

1. **Document** current Meta setup: either **only n8n** receives Meta webhook, or **Meta → n8n → forward** to dashboard (recommended HTTP Request nodes).
2. Add **`POST /api/internal/ingest/whatsapp`** with **shared idempotency key** = WhatsApp `wamid` (same as Meta path).
3. **Do not** remove `/api/webhooks/meta`; clients who point Meta **directly** here keep working.

### Phase B — Takeover state in DB + n8n branches

1. Migrate/admin **`vaani_managed`** *or* formalize **`mode` + timestamps**.
2. Implement **PATCH takeover** + update **`takeover-handler`** to call same service or redirect.
3. Publish **n8n recipe**: IF `vaani_managed=false` THEN skip auto-reply AND POST inbound copy to dashboard ingest.

### Phase C — WhatsApp-parity UX (incremental)

1. Filters: **resolved/open**, **unread** (define: last inbound > last read cursor per profile).
2. Composer rules: **session vs template** + clear Graph error mapping.

### Phase D — Profile fields

1. Add nullable **`avatar_url` / `wa_display_name`** on `leads`.
2. Fill from webhook only when Meta supplies data; else initials.

### Phase E — Observability

1. Queue depth, webhook failures, template rejection rate—aligned with parity matrix.

---

## References in repo

- Rolled-out schema: [`supabase-rolled-out-schema.md`](./supabase-rolled-out-schema.md)  
- Cron & ops: [`cron-examples.md`](./cron-examples.md), [`supabase-pending-work.md`](./supabase-pending-work.md)  
- Product status narrative: [`project_status.md`](./project_status.md)

---

*Audit reflects codebase scan + Meta ecosystem constraints; adjust when Meta Graph changelog updates session/template rules.*

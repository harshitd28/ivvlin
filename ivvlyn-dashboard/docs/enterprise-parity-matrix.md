# Enterprise parity matrix (Interakt / WATI)

**Project status (shipped vs remaining, real-world “why”):** [`docs/project_status.md`](./project_status.md)

**n8n → dashboard forward (Meta webhook not on app):** [`docs/n8n-whatsapp-forward.md`](./n8n-whatsapp-forward.md)

**Supabase batch checklist (migrations, cron, RLS reminders):** [`docs/supabase-pending-work.md`](./supabase-pending-work.md)

**Cron `curl` snippets:** [`docs/cron-examples.md`](./cron-examples.md)

| Capability | Interakt / WATI (target) | Ivvlin today | MVP must-ship (plan) |
|------------|---------------------------|--------------|----------------------|
| Team inbox + assignment | Queues, ownership, collision control | Inbox UI + realtime; Phase 2: assignee, SLA due from inbound, notes, thread lock | Scale: Redis fast-lane + `worker:outbound` for drain |
| Broadcasts / campaigns | Segments, templates, schedule, analytics | MVP: `/dashboard/campaigns`, segment filters, schedule + cron dispatch, queue fan-out | Meta template rails + richer analytics |
| Automation / journeys | Event triggers, quiet hours, caps | n8n / external | Rules engine MVP in-app |
| Delivery reliability | Webhooks, receipts, retries | Phase 1: idempotency + outbound jobs + Meta webhook | Queue worker + DLQ discipline |
| Tenant isolation | RLS, audit, rate limits | App-level roles | RLS + audit log + limits |
| Observability | Dashboards, alerts | **In-app:** queue lag, insights API, **`webhook_delivery_events`**, **`/dashboard/messaging`** DLQ + requeue | Charts, alerts, send % SLOs |

## Frozen scope (must-ship vs defer)

**Must-ship (6-week MVP):** team inbox + ownership + SLA + receipts + media; lead workspace; campaigns with template rails; basic automation; tenant admin for channels + metering.

**Defer:** full journey builder, advanced AI copilot, broad integration marketplace.

## Environment (Phase 1 messaging)

| Variable | Purpose |
|----------|---------|
| `META_APP_SECRET` | Verify `X-Hub-Signature-256` on `POST /api/webhooks/meta` (required in production). |
| `META_VERIFY_TOKEN` | WhatsApp webhook verification (`GET` challenge). |
| `WEBHOOK_SHARED_SECRET` | Optional Bearer / `x-ivvlin-webhook-secret` for `/webhook/takeover-handler`. |
| `INTERNAL_INGEST_SECRET` | `Authorization: Bearer` for `POST /api/internal/ingest/whatsapp` (n8n-forwarded Meta events). |
| `WHATSAPP_SKIP_SESSION_WINDOW` | Dev only (`1`): skip 24h session validation on agent text enqueue. |
| `CRON_SECRET` | `Authorization: Bearer` for `POST /api/internal/messaging/process-queue`. |
| `REDIS_URL` | Optional: LPUSH/RPOP fast-lane for job ids (`ivv:outbound:v1` or `REDIS_OUTBOUND_QUEUE_KEY`). |
| `MESSAGING_ENQUEUE_DRAIN_MAX` | Optional: jobs drained via `after()` post-enqueue (default 8). |
| `WORKER_POLL_MS` / `WORKER_MAX_JOBS` | Optional: `npm run worker:outbound` loop tuning. |
| `CAMPAIGN_MAX_RECIPIENTS` | Optional cap (default 2000) when fanning out campaign sends. |
| `MESSAGING_SKIP_PROVIDER_SEND=1` | Dev only: mark outbound jobs sent without calling Graph API. |

Configure Meta webhook URL: `https://<your-domain>/api/webhooks/meta`.

**Phase 2 inbox APIs:** `PATCH /api/inbox/leads` (assignee, pinned, **`mode`** ai/human + takeover timestamps), `PATCH /api/inbox/thread-status` (resolve/reopen latest row), `GET /api/inbox/messaging-insights` (counts + lag + recent errors + webhook 24h), `GET /api/inbox/queue-counts` (counts-only), `GET/POST /api/inbox/dead-jobs` (DLQ list + requeue), `GET/POST/DELETE /api/inbox/wa-template-presets`, `GET/POST /api/inbox/notes`, `POST /api/inbox/lock`. Apply migration `20260502120000_team_inbox_and_queue_scale.sql` for columns + `inbox_notes`; later migrations add **`wa_template_presets`**, **`webhook_delivery_events`**, **`outbound_message_jobs`** column alignment.

**Phase 3 campaigns:** `GET/POST /api/campaigns`, `POST /api/campaigns/[id]/launch`, `POST /api/internal/campaigns/dispatch-scheduled`. Apply migrations `20260504120000_campaigns_mvp.sql` then `20260505120000_campaigns_whatsapp_templates.sql`. Use `send_kind: template` + approved Meta template name / language / body params for compliant broadcasts.

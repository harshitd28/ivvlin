# n8n → dashboard WhatsApp forward

Use when **Meta’s webhook points at n8n** (not at this app). Forward inbound messages and delivery statuses so **`/dashboard/conversations`** stays live.

**Endpoint:** `POST /api/internal/ingest/whatsapp` on your deployed dashboard origin.

**Auth:** header `Authorization: Bearer <INTERNAL_INGEST_SECRET>` (set in Vercel / `.env.local`).

**Do not** expose `INTERNAL_INGEST_SECRET` in browser code — call only from n8n/server.

---

## Inbound message

Minimal JSON (resolve lead by phone):

```json
{
  "whatsapp_message_id": "wamid.HBgN...",
  "whatsapp_phone_id": "<Meta phone_number_id from webhook>",
  "customer_phone": "+9198xxxxxxxx",
  "text": "Hello",
  "type": "text"
}
```

Or fix client + lead explicitly:

```json
{
  "whatsapp_message_id": "wamid.HBgN...",
  "client_id": "<uuid clients.id>",
  "lead_id": "<text leads.lead_id>",
  "customer_phone": "+9198xxxxxxxx",
  "text": "Hello",
  "type": "text"
}
```

Idempotency matches **`/api/webhooks/meta`**: same WhatsApp id uses keys `wa:msg:<id>` — duplicates return `{ "ok": true, "duplicate": true }`.

---

## Delivery / read status

Forward WhatsApp status callbacks so outbound bubbles update receipts:

```json
{
  "event": "status",
  "whatsapp_message_id": "<Graph outbound message id>",
  "status": "delivered",
  "client_id": "<uuid>"
}
```

Supported `status` values align with Meta (e.g. `sent`, `delivered`, `read`, `failed`). Use **`whatsapp_phone_id`** instead of `client_id` if easier.

---

## n8n wiring (outline)

1. **Webhook** node receives Meta payload (same JSON Meta sends to your URL).
2. **HTTP Request** — POST to `https://<your-domain>/api/internal/ingest/whatsapp`, headers `Authorization: Bearer …`, `Content-Type: application/json`, body mapped from Meta `messages[]` / `statuses[]`.
3. On duplicate (`duplicate: true`), treat as success (Meta retries).

---

## Automation vs human takeover

Downstream rows include **`metadata.lead_mode`** (`ai` \| `human`) and **`metadata.human_takeover_active`** (boolean). When **`leads.mode`** is `human`, branch workflows to **skip auto-replies** and only forward to the dashboard.

See also [`whatsapp-platform-architecture-audit.md`](./whatsapp-platform-architecture-audit.md).

---

## Troubleshooting API responses

| HTTP | `code` | Meaning |
|------|--------|---------|
| **400** | `client_not_resolved` | Missing / unknown `client_id` or `whatsapp_phone_id`. |
| **404** | `lead_not_found` | No `leads` row for `customer_phone`, or wrong text `lead_id`. Fix CRM phone / pass explicit `lead_id`. |
| **401** | — | Wrong or missing `Authorization: Bearer` (`INTERNAL_INGEST_SECRET`). |

JSON bodies include a **`hint`** string for n8n error branches / logs.

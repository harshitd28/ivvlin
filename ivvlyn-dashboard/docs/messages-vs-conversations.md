# `messages` vs `conversations`

The dashboard **inbox and chat thread** read and write **`public.conversations`** (one row per message/event, with inbox columns and realtime).

**`public.messages`** exists from earlier CRM history. Join rules differ:

| Table | Join to lead |
|-------|----------------|
| `conversations.lead_id` | **`leads.lead_id`** (text) |
| `messages.lead_id` | **`leads.id`** (uuid) |

**Recommendation:** Treat **`conversations`** as the **canonical thread** for WhatsApp-style messaging. Use **`messages`** only if another integration still writes there — if both are populated, define an explicit sync job or deprecate duplicate writes to avoid split brains.

See [`supabase-rolled-out-schema.md`](./supabase-rolled-out-schema.md) and [`project_status.md`](./project_status.md).

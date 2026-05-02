# Cron / worker examples (production)

Internal routes expect **`Authorization: Bearer <CRON_SECRET>`** (see [`enterprise-parity-matrix.md`](./enterprise-parity-matrix.md)).

## Cron-friendly routes (GET + POST)

Use these for HTTP schedulers that only issue **GET** (including **Vercel Cron**):

| Path | Role |
|------|------|
| `/api/cron/queue` | Drain outbound job queue (`maxJobs` optional JSON body on POST) |
| `/api/cron/sla` | SLA breach sweep |
| `/api/cron/campaigns` | Dispatch scheduled campaigns (`max` optional JSON body on POST) |
| `/api/cron/all` | Runs **queue → SLA → campaigns** in one request |

Legacy paths (**POST only**): `/api/internal/messaging/process-queue`, `/api/internal/inbox/sla-sweep`, `/api/internal/campaigns/dispatch-scheduled` — same handlers.

Replace `https://your-domain.com` and set `CRON_SECRET` in your shell or CI secrets.

### Vercel

Add **`CRON_SECRET`** (≥16 random chars) to **Project → Settings → Environment Variables**. Vercel Cron automatically sends **`Authorization: Bearer <CRON_SECRET>`** when invoking your route ([docs](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs)).

Merge [`vercel-crons-pro.example.json`](./vercel-crons-pro.example.json) into `vercel.json` if your plan allows frequent schedules (**Hobby**: at most **one** cron per day — use GitHub Actions + `curl` below, or upgrade).

### Drain outbound queue

```bash
curl -sS -X GET "https://your-domain.com/api/cron/queue" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

```bash
curl -sS -X POST "https://your-domain.com/api/cron/queue" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"maxJobs":40}'
```

### SLA breach sweep

```bash
curl -sS -X GET "https://your-domain.com/api/cron/sla" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Dispatch scheduled campaigns

```bash
curl -sS -X GET "https://your-domain.com/api/cron/campaigns" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### All-in-one (every 15–60 min typical)

```bash
curl -sS -X GET "https://your-domain.com/api/cron/all" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## Worker process

For higher throughput, run **`npm run worker:outbound`** on a VM or container (uses Redis optional fast-lane + Postgres).

## Scheduling summary

Suggested intervals: [`supabase-pending-work.md`](./supabase-pending-work.md) §4.

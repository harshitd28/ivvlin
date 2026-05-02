-- Phase 1: reliability foundation — message lifecycle, idempotency, outbound queue
-- Run in Supabase SQL editor or via supabase db push.

-- Conversations: provider + lifecycle (UI keeps using status for sent/delivered/read)
alter table if exists public.conversations
  add column if not exists lifecycle_state text
    check (lifecycle_state is null or lifecycle_state in ('queued', 'sent', 'delivered', 'read', 'failed'));

alter table if exists public.conversations
  add column if not exists provider_message_id text;

alter table if exists public.conversations
  add column if not exists retry_count integer not null default 0;

alter table if exists public.conversations
  add column if not exists idempotency_key text;

create unique index if not exists conversations_idempotency_key_uidx
  on public.conversations (idempotency_key)
  where idempotency_key is not null;

-- Dedupe keys for webhooks (Meta/WhatsApp, takeover relay, etc.)
create table if not exists public.webhook_idempotency (
  idempotency_key text primary key,
  source text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists webhook_idempotency_created_at_idx
  on public.webhook_idempotency (created_at desc);

-- Postgres-backed outbound queue (upgrade path: Redis/worker pool later)
create table if not exists public.outbound_message_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references public.clients (id) on delete cascade,
  lead_id text not null,
  channel text not null,
  conversation_id uuid references public.conversations (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  state text not null default 'pending'
    check (state in ('pending', 'processing', 'sent', 'failed', 'dead')),
  attempts integer not null default 0,
  max_attempts integer not null default 8,
  scheduled_at timestamptz default now(),
  last_error text,
  provider_message_id text
);

-- Prod may already have this table without scheduled_at; ensure column exists before index.
alter table if exists public.outbound_message_jobs
  add column if not exists scheduled_at timestamptz default now();

create index if not exists outbound_message_jobs_pending_idx
  on public.outbound_message_jobs (scheduled_at asc)
  where state = 'pending';

create index if not exists outbound_message_jobs_client_idx
  on public.outbound_message_jobs (client_id, created_at desc);

-- Phase 3 MVP: broadcast campaigns → same outbound queue as 1:1 chat

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references public.clients (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  name text not null,
  channel text not null default 'whatsapp',
  message_body text not null,
  audience_filter jsonb not null default '{}'::jsonb,
  state text not null default 'draft'
    check (state in ('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled')),
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  stats_total_targets integer not null default 0,
  stats_enqueued integer not null default 0,
  stats_failed integer not null default 0
);

create index if not exists campaigns_client_created_idx
  on public.campaigns (client_id, created_at desc);

create index if not exists campaigns_scheduled_idx
  on public.campaigns (state, scheduled_for)
  where state = 'scheduled' and scheduled_for is not null;

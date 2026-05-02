-- Phase 2 + scaled backbone: team inbox (assignment, SLA, notes, locks), job priority

alter table if exists public.leads
  add column if not exists assigned_to_user_id uuid references public.profiles (id) on delete set null;

alter table if exists public.leads
  add column if not exists inbox_starred boolean not null default false;

alter table if exists public.leads
  add column if not exists sla_target_minutes integer not null default 15;

alter table if exists public.leads
  add column if not exists first_response_due_at timestamptz;

alter table if exists public.leads
  add column if not exists sla_breached_at timestamptz;

alter table if exists public.leads
  add column if not exists inbox_locked_until timestamptz;

alter table if exists public.leads
  add column if not exists inbox_locked_by uuid references public.profiles (id) on delete set null;

create index if not exists leads_client_assigned_idx
  on public.leads (client_id, assigned_to_user_id)
  where assigned_to_user_id is not null;

create index if not exists leads_first_response_due_idx
  on public.leads (client_id, first_response_due_at)
  where first_response_due_at is not null;

-- Internal notes (not sent to customer)
create table if not exists public.inbox_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.clients (id) on delete cascade,
  lead_id text not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null
);

create index if not exists inbox_notes_lead_idx
  on public.inbox_notes (client_id, lead_id, created_at desc);

-- Outbound job priority (higher = sooner); Redis fast-lane optional in app layer
alter table if exists public.outbound_message_jobs
  add column if not exists priority integer not null default 0;

create index if not exists outbound_message_jobs_priority_pending_idx
  on public.outbound_message_jobs (priority desc, scheduled_at asc)
  where state = 'pending';

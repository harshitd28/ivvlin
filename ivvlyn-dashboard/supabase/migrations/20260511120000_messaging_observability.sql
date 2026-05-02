-- Lightweight webhook visibility + DLQ-adjacent auditing (tenant-scoped reads).

create table if not exists public.webhook_delivery_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid references public.clients (id) on delete set null,
  source text not null,
  event_kind text not null,
  outcome text not null check (outcome in ('ok', 'skipped', 'error')),
  error_message text,
  detail jsonb not null default '{}'::jsonb
);

create index if not exists webhook_delivery_events_client_created_idx
  on public.webhook_delivery_events (client_id, created_at desc);

create index if not exists webhook_delivery_events_created_idx
  on public.webhook_delivery_events (created_at desc);

alter table public.webhook_delivery_events enable row level security;

drop policy if exists webhook_delivery_events_select_tenant on public.webhook_delivery_events;

create policy webhook_delivery_events_select_tenant
  on public.webhook_delivery_events for select to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

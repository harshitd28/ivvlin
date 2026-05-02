-- Tenant-scoped audit trail for sensitive dashboard actions (insert via service role from API routes).

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  detail jsonb not null default '{}'::jsonb
);

create index if not exists audit_events_client_created_idx
  on public.audit_events (client_id, created_at desc);

create index if not exists audit_events_actor_created_idx
  on public.audit_events (actor_user_id, created_at desc);

alter table public.audit_events enable row level security;

drop policy if exists audit_events_select_tenant on public.audit_events;

create policy audit_events_select_tenant
  on public.audit_events for select to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

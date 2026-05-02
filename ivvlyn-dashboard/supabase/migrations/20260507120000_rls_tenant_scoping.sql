-- Tenant-scoped Row Level Security for dashboard users (JWT / anon key + session).
-- Service role (webhooks, workers, internal APIs) bypasses RLS in Supabase.
-- Apply on staging first; verify admin /dashboard and client /dashboard flows.
-- Requires public.profiles(id, role, client_id) as in repo schema.

create or replace function public.ivv_current_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.ivv_current_client_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select p.client_id
  from public.profiles p
  where p.id = auth.uid();
$$;

grant execute on function public.ivv_current_is_admin() to authenticated;
grant execute on function public.ivv_current_client_id() to authenticated;

-- ---- leads ----
alter table public.leads enable row level security;

drop policy if exists leads_select_tenant on public.leads;
drop policy if exists leads_insert_tenant on public.leads;
drop policy if exists leads_update_tenant on public.leads;
drop policy if exists leads_delete_tenant on public.leads;

create policy leads_select_tenant
  on public.leads for select to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy leads_insert_tenant
  on public.leads for insert to authenticated
  with check (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy leads_update_tenant
  on public.leads for update to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  )
  with check (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy leads_delete_tenant
  on public.leads for delete to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

-- ---- conversations ----
alter table public.conversations enable row level security;

drop policy if exists conversations_select_tenant on public.conversations;
drop policy if exists conversations_insert_tenant on public.conversations;
drop policy if exists conversations_update_tenant on public.conversations;
drop policy if exists conversations_delete_tenant on public.conversations;

create policy conversations_select_tenant
  on public.conversations for select to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy conversations_insert_tenant
  on public.conversations for insert to authenticated
  with check (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy conversations_update_tenant
  on public.conversations for update to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  )
  with check (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy conversations_delete_tenant
  on public.conversations for delete to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

-- ---- activities ----
alter table public.activities enable row level security;

drop policy if exists activities_select_tenant on public.activities;
drop policy if exists activities_insert_tenant on public.activities;
drop policy if exists activities_update_tenant on public.activities;
drop policy if exists activities_delete_tenant on public.activities;

create policy activities_select_tenant
  on public.activities for select to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy activities_insert_tenant
  on public.activities for insert to authenticated
  with check (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy activities_update_tenant
  on public.activities for update to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  )
  with check (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy activities_delete_tenant
  on public.activities for delete to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

-- (If you use public.visits, add RLS policies mirroring leads — same client_id + admin pattern.)

-- ---- inbox_notes ----
alter table if exists public.inbox_notes enable row level security;

drop policy if exists inbox_notes_select_tenant on public.inbox_notes;
drop policy if exists inbox_notes_insert_tenant on public.inbox_notes;
drop policy if exists inbox_notes_update_tenant on public.inbox_notes;
drop policy if exists inbox_notes_delete_tenant on public.inbox_notes;

create policy inbox_notes_select_tenant
  on public.inbox_notes for select to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy inbox_notes_insert_tenant
  on public.inbox_notes for insert to authenticated
  with check (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy inbox_notes_update_tenant
  on public.inbox_notes for update to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  )
  with check (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy inbox_notes_delete_tenant
  on public.inbox_notes for delete to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

-- ---- clients (tenant org row) ----
alter table public.clients enable row level security;

drop policy if exists clients_select_tenant on public.clients;
drop policy if exists clients_update_admin on public.clients;

create policy clients_select_tenant
  on public.clients for select to authenticated
  using (
    public.ivv_current_is_admin()
    or id = public.ivv_current_client_id()
  );

create policy clients_update_admin
  on public.clients for update to authenticated
  using (public.ivv_current_is_admin())
  with check (public.ivv_current_is_admin());

-- ---- profiles (teammates in same org + self update) ----
alter table public.profiles enable row level security;

drop policy if exists profiles_select_tenant on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_tenant
  on public.profiles for select to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
    or id = auth.uid()
  );

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---- campaigns ----
alter table if exists public.campaigns enable row level security;

drop policy if exists campaigns_select_tenant on public.campaigns;
drop policy if exists campaigns_insert_tenant on public.campaigns;
drop policy if exists campaigns_update_tenant on public.campaigns;
drop policy if exists campaigns_delete_tenant on public.campaigns;

create policy campaigns_select_tenant
  on public.campaigns for select to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy campaigns_insert_tenant
  on public.campaigns for insert to authenticated
  with check (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy campaigns_update_tenant
  on public.campaigns for update to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  )
  with check (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy campaigns_delete_tenant
  on public.campaigns for delete to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

-- If `public.credit_logs` exists in your project, enable RLS and add:
--   SELECT using (ivv_current_is_admin() OR client_id = ivv_current_client_id())

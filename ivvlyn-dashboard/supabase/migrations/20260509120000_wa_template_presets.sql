-- Team-wide WhatsApp template presets for inbox composer (tenant-scoped).

create table if not exists public.wa_template_presets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references public.clients (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  label text not null,
  template_name text not null,
  template_language text not null default 'en_US',
  params_lines text not null default '',
  sort_order integer not null default 0
);

create index if not exists wa_template_presets_client_sort_idx
  on public.wa_template_presets (client_id, sort_order asc, created_at asc);

alter table public.wa_template_presets enable row level security;

drop policy if exists wa_template_presets_select_tenant on public.wa_template_presets;
drop policy if exists wa_template_presets_insert_tenant on public.wa_template_presets;
drop policy if exists wa_template_presets_update_tenant on public.wa_template_presets;
drop policy if exists wa_template_presets_delete_tenant on public.wa_template_presets;

create policy wa_template_presets_select_tenant
  on public.wa_template_presets for select to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy wa_template_presets_insert_tenant
  on public.wa_template_presets for insert to authenticated
  with check (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy wa_template_presets_update_tenant
  on public.wa_template_presets for update to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  )
  with check (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

create policy wa_template_presets_delete_tenant
  on public.wa_template_presets for delete to authenticated
  using (
    public.ivv_current_is_admin()
    or client_id = public.ivv_current_client_id()
  );

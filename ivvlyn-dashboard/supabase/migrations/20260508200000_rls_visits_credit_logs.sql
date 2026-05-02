-- RLS for optional tables (not in all greenfield DBs). Requires functions from 20260507120000_rls_tenant_scoping.sql.

do $body$
begin
  if to_regclass('public.visits') is not null then
    execute 'alter table public.visits enable row level security';
    execute 'drop policy if exists visits_select_tenant on public.visits';
    execute 'drop policy if exists visits_insert_tenant on public.visits';
    execute 'drop policy if exists visits_update_tenant on public.visits';
    execute 'drop policy if exists visits_delete_tenant on public.visits';

    execute $sql$
      create policy visits_select_tenant on public.visits for select to authenticated
      using (public.ivv_current_is_admin() or client_id = public.ivv_current_client_id())
    $sql$;

    execute $sql$
      create policy visits_insert_tenant on public.visits for insert to authenticated
      with check (public.ivv_current_is_admin() or client_id = public.ivv_current_client_id())
    $sql$;

    execute $sql$
      create policy visits_update_tenant on public.visits for update to authenticated
      using (public.ivv_current_is_admin() or client_id = public.ivv_current_client_id())
      with check (public.ivv_current_is_admin() or client_id = public.ivv_current_client_id())
    $sql$;

    execute $sql$
      create policy visits_delete_tenant on public.visits for delete to authenticated
      using (public.ivv_current_is_admin() or client_id = public.ivv_current_client_id())
    $sql$;
  end if;

  if to_regclass('public.credit_logs') is not null then
    execute 'alter table public.credit_logs enable row level security';
    execute 'drop policy if exists credit_logs_select_tenant on public.credit_logs';

    execute $sql$
      create policy credit_logs_select_tenant on public.credit_logs for select to authenticated
      using (public.ivv_current_is_admin() or client_id = public.ivv_current_client_id())
    $sql$;
  end if;
end
$body$;

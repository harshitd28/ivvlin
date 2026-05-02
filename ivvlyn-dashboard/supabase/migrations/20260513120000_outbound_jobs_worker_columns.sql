-- Columns referenced by enqueue + dispatch worker; safe no-ops if already present (e.g. manual prod DDL).

alter table public.outbound_message_jobs add column if not exists to_phone text;
alter table public.outbound_message_jobs add column if not exists message_type text;
alter table public.outbound_message_jobs add column if not exists template_name text;
alter table public.outbound_message_jobs add column if not exists template_language text;
alter table public.outbound_message_jobs add column if not exists priority integer not null default 0;
alter table public.outbound_message_jobs add column if not exists locked_at timestamptz;
alter table public.outbound_message_jobs add column if not exists locked_by text;
alter table public.outbound_message_jobs add column if not exists sent_at timestamptz;
alter table public.outbound_message_jobs add column if not exists failed_at timestamptz;
alter table public.outbound_message_jobs add column if not exists error text;
alter table public.outbound_message_jobs add column if not exists external_message_id text;

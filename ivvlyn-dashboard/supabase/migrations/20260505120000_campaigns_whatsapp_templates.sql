-- Campaigns: Meta-approved WhatsApp template messages (Graph API type=template)

alter table public.campaigns add column if not exists send_kind text not null default 'text';
alter table public.campaigns add column if not exists template_name text;
alter table public.campaigns add column if not exists template_language text;
alter table public.campaigns add column if not exists template_body_params jsonb not null default '[]'::jsonb;

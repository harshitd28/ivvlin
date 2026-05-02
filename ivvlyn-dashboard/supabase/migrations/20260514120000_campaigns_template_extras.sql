-- Rich WhatsApp template options for campaigns (header media/text, buttons).
-- Merged into outbound job payload for template sends (see launch.ts).

alter table public.campaigns
  add column if not exists template_extras jsonb not null default '{}'::jsonb;

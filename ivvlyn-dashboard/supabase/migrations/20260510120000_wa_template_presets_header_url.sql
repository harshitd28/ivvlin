-- Optional header / URL-button lines for team WhatsApp template presets.

alter table public.wa_template_presets
  add column if not exists header_params_lines text not null default '';

alter table public.wa_template_presets
  add column if not exists url_button_index text not null default '';

alter table public.wa_template_presets
  add column if not exists url_button_suffix text not null default '';

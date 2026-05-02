-- Optional IMAGE/VIDEO/DOCUMENT header URLs for template presets.

alter table public.wa_template_presets
  add column if not exists header_media_kind text not null default '';

alter table public.wa_template_presets
  add column if not exists header_media_url text not null default '';

alter table public.wa_template_presets
  add column if not exists header_document_filename text not null default '';

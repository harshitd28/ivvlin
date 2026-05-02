-- Ivvlin platform schema reference
-- Documentation-only file: do not execute directly in production.
-- Purpose: define the minimum table contract required by app code.

-- profiles
-- (id, email, role, client_id, full_name, avatar_url, inbox_last_seen_at)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text check (role in ('admin', 'client')),
  client_id uuid,
  full_name text,
  avatar_url text,
  inbox_last_seen_at timestamptz
);

-- clients
-- (id, business_name, agent_name, industry, city, state, status,
--  whatsapp_enabled, whatsapp_phone_id, whatsapp_access_token,
--  instagram_enabled, instagram_page_id, instagram_access_token,
--  facebook_enabled, facebook_page_id, facebook_access_token,
--  sms_enabled, msg91_auth_key, msg91_sender_id, email_enabled,
--  salesperson_phone, owner_email, briefing_time, alert_score_threshold,
--  claude_model, max_tokens, system_prompt, claude_calls_total,
--  claude_calls_month, whatsapp_sent_total, whatsapp_sent_month,
--  sms_sent_total, sms_sent_month, email_sent_total, email_sent_month,
--  last_month_reset)
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  agent_name text,
  industry text,
  city text,
  state text,
  status text default 'active',
  whatsapp_enabled boolean default false,
  whatsapp_phone_id text,
  whatsapp_access_token text,
  instagram_enabled boolean default false,
  instagram_page_id text,
  instagram_access_token text,
  facebook_enabled boolean default false,
  facebook_page_id text,
  facebook_access_token text,
  sms_enabled boolean default false,
  msg91_auth_key text,
  msg91_sender_id text,
  email_enabled boolean default false,
  salesperson_phone text,
  owner_email text,
  briefing_time time,
  alert_score_threshold integer default 70,
  claude_model text,
  max_tokens integer default 600,
  system_prompt text,
  claude_calls_total bigint default 0,
  claude_calls_month bigint default 0,
  whatsapp_sent_total bigint default 0,
  whatsapp_sent_month bigint default 0,
  sms_sent_total bigint default 0,
  sms_sent_month bigint default 0,
  email_sent_total bigint default 0,
  email_sent_month bigint default 0,
  last_month_reset date
);

-- leads
-- (id, lead_id, name, phone, email, source, message, budget,
--  bhk_preference, location_preference, status, score, stage, follow_up_step,
--  preferred_lang, mode, dnd, follow_up_paused, assigned_to, created_at,
--  instagram_psid, facebook_psid, preferred_channel, client_id, channel,
--  takeover_at, handback_at,
--  Phase 2: assigned_to_user_id, inbox_starred, sla_target_minutes,
--  first_response_due_at, sla_breached_at, inbox_locked_until, inbox_locked_by)
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  lead_id text unique,
  name text,
  phone text,
  email text,
  source text,
  message text,
  budget text,
  bhk_preference text,
  location_preference text,
  status text,
  score integer default 0,
  stage text,
  follow_up_step integer default 0,
  preferred_lang text,
  mode text default 'ai',
  dnd boolean default false,
  follow_up_paused boolean default false,
  assigned_to text,
  created_at timestamptz default now(),
  instagram_psid text,
  facebook_psid text,
  preferred_channel text,
  client_id uuid references clients(id) on delete cascade,
  channel text,
  takeover_at timestamptz,
  handback_at timestamptz,
  assigned_to_user_id uuid references profiles(id) on delete set null,
  inbox_starred boolean not null default false,
  sla_target_minutes integer not null default 15,
  first_response_due_at timestamptz,
  sla_breached_at timestamptz,
  inbox_locked_until timestamptz,
  inbox_locked_by uuid references profiles(id) on delete set null
);

-- activities
-- (id, lead_id, timestamp, type, channel, direction, content, metadata,
--  is_automated, status, error_message, client_id, workflow_name)
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  lead_id text,
  "timestamp" timestamptz default now(),
  type text,
  channel text,
  direction text,
  content text,
  metadata jsonb,
  is_automated boolean default true,
  status text,
  error_message text,
  client_id uuid references clients(id) on delete cascade,
  workflow_name text
);

-- credit_logs
-- (id, created_at, client_id, log_type, channel, lead_id,
--  tokens_used, cost_inr, workflow_name, status)
create table if not exists credit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  client_id uuid references clients(id) on delete cascade,
  log_type text,
  channel text,
  lead_id text,
  tokens_used integer default 0,
  cost_inr numeric(12, 4) default 0,
  workflow_name text,
  status text
);

-- conversations (inbox / thread rows; realtime channel for dashboard)
-- Extended Phase 1: lifecycle_state, provider_message_id, retry_count, idempotency_key
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  client_id uuid not null references clients(id) on delete cascade,
  lead_id text,
  channel text not null default 'whatsapp',
  direction text not null check (direction in ('inbound', 'outbound')),
  message text not null,
  is_automated boolean default false,
  status text,
  intent text,
  sentiment text,
  lifecycle_state text check (lifecycle_state is null or lifecycle_state in ('queued', 'sent', 'delivered', 'read', 'failed')),
  provider_message_id text,
  retry_count integer not null default 0,
  idempotency_key text
);

create unique index if not exists conversations_idempotency_key_uidx
  on conversations (idempotency_key)
  where idempotency_key is not null;

-- webhook_idempotency: dedupe inbound provider callbacks and internal webhooks
create table if not exists webhook_idempotency (
  idempotency_key text primary key,
  source text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- outbound_message_jobs: Postgres-backed queue; optional Redis fast-lane in app
create table if not exists outbound_message_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references clients(id) on delete cascade,
  lead_id text not null,
  channel text not null,
  conversation_id uuid references conversations(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  state text not null default 'pending'
    check (state in ('pending', 'processing', 'sent', 'failed', 'dead')),
  priority integer not null default 0,
  attempts integer not null default 0,
  max_attempts integer not null default 8,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  provider_message_id text
);

-- inbox_notes: internal team notes (not visible to lead)
create table if not exists inbox_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references clients(id) on delete cascade,
  lead_id text not null,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null
);

-- campaigns: broadcast MVP → fan-out to outbound_message_jobs
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references clients(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  name text not null,
  channel text not null default 'whatsapp',
  message_body text not null,
  send_kind text not null default 'text',
  template_name text,
  template_language text,
  template_body_params jsonb not null default '[]'::jsonb,
  audience_filter jsonb not null default '{}'::jsonb,
  state text not null default 'draft'
    check (state in ('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled')),
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  stats_total_targets integer not null default 0,
  stats_enqueued integer not null default 0,
  stats_failed integer not null default 0
);


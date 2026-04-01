-- Ivvlyn Dashboard — Supabase schema + RLS
-- Run in Supabase SQL editor.

-- Enable required extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- CLIENTS TABLE
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  name text not null,
  business_name text not null,
  email text not null unique,
  phone text,
  industry text not null,
  agent_type text not null,
  plan text default 'starter',
  status text default 'active',
  city text,
  whatsapp_phone_id text,
  whatsapp_access_token text,
  instagram_page_id text,
  meta_app_id text,
  system_prompt text,
  logo_url text,
  onboarded_at timestamp with time zone,
  notes text
);

-- LEADS TABLE
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  client_id uuid references clients(id) on delete cascade,
  lead_id text unique,
  name text,
  phone text,
  email text,
  source text,
  channel text default 'whatsapp',
  instagram_psid text,
  instagram_username text,
  preferred_channel text default 'whatsapp',
  message text,
  budget text,
  bhk_preference text,
  location_preference text,
  score integer default 25,
  status text default 'new',
  stage text default 'new',
  mode text default 'ai',
  dnd boolean default false,
  preferred_lang text default 'auto',
  follow_up_step integer default 1,
  follow_up_paused boolean default false,
  assigned_to text default 'unassigned',
  last_reply_at timestamp with time zone,
  last_contact timestamp with time zone,
  visit_date date,
  visit_time text,
  property_interest text,
  all_sources text,
  owner_summary text,
  urgency text default 'normal',
  intent text
);

-- CONVERSATIONS TABLE
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  client_id uuid references clients(id) on delete cascade,
  lead_id text references leads(lead_id),
  channel text not null,
  direction text not null,
  message text not null,
  is_automated boolean default true,
  status text default 'sent',
  intent text,
  sentiment text
);

-- ACTIVITIES TABLE
create table if not exists activities (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  client_id uuid references clients(id) on delete cascade,
  lead_id text references leads(lead_id),
  type text not null,
  channel text,
  direction text,
  content text,
  is_automated boolean default true,
  status text default 'sent'
);

-- VISITS TABLE
create table if not exists visits (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  client_id uuid references clients(id) on delete cascade,
  lead_id text references leads(lead_id),
  lead_name text,
  lead_phone text,
  visit_date date not null,
  visit_time text,
  property text,
  status text default 'scheduled',
  reminder_sent boolean default false,
  notes text
);

-- USER PROFILES TABLE
create table if not exists profiles (
  id uuid references auth.users primary key,
  created_at timestamp with time zone default now(),
  email text,
  role text default 'client',
  client_id uuid references clients(id),
  full_name text,
  avatar_url text
);

-- ROW LEVEL SECURITY
alter table clients enable row level security;
alter table leads enable row level security;
alter table conversations enable row level security;
alter table activities enable row level security;
alter table visits enable row level security;
alter table profiles enable row level security;

-- RLS POLICIES

-- Profiles: users see only their own
drop policy if exists "Users see own profile" on profiles;
create policy "Users see own profile"
  on profiles for all
  using (auth.uid() = id);

-- Admin sees everything (check role = 'admin')
drop policy if exists "Admin sees all clients" on clients;
create policy "Admin sees all clients"
  on clients for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- Client sees only their own client record
drop policy if exists "Client sees own data" on clients;
create policy "Client sees own data"
  on clients for select
  using (
    id = (
      select client_id from profiles
      where id = auth.uid()
    )
  );

-- LEADS: Admin sees all
drop policy if exists "Admin sees all leads" on leads;
create policy "Admin sees all leads"
  on leads for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- LEADS: Client sees their own leads (and can update status fields)
drop policy if exists "Client sees own leads (select)" on leads;
create policy "Client sees own leads (select)"
  on leads for select
  using (
    client_id = (
      select client_id from profiles
      where id = auth.uid()
    )
  );

drop policy if exists "Client can update own leads" on leads;
create policy "Client can update own leads"
  on leads for update
  using (
    client_id = (
      select client_id from profiles
      where id = auth.uid()
    )
  )
  with check (
    client_id = (
      select client_id from profiles
      where id = auth.uid()
    )
  );

-- CONVERSATIONS: Admin sees all
drop policy if exists "Admin sees all conversations" on conversations;
create policy "Admin sees all conversations"
  on conversations for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- CONVERSATIONS: Client sees only their own
drop policy if exists "Client sees own conversations" on conversations;
create policy "Client sees own conversations"
  on conversations for select
  using (
    client_id = (
      select client_id from profiles
      where id = auth.uid()
    )
  );

-- ACTIVITIES: Admin sees all
drop policy if exists "Admin sees all activities" on activities;
create policy "Admin sees all activities"
  on activities for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- ACTIVITIES: Client sees only their own
drop policy if exists "Client sees own activities" on activities;
create policy "Client sees own activities"
  on activities for select
  using (
    client_id = (
      select client_id from profiles
      where id = auth.uid()
    )
  );

-- VISITS: Admin sees all
drop policy if exists "Admin sees all visits" on visits;
create policy "Admin sees all visits"
  on visits for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- VISITS: Client sees only their own (and can update status)
drop policy if exists "Client sees own visits (select)" on visits;
create policy "Client sees own visits (select)"
  on visits for select
  using (
    client_id = (
      select client_id from profiles
      where id = auth.uid()
    )
  );

drop policy if exists "Client can update own visits" on visits;
create policy "Client can update own visits"
  on visits for update
  using (
    client_id = (
      select client_id from profiles
      where id = auth.uid()
    )
  )
  with check (
    client_id = (
      select client_id from profiles
      where id = auth.uid()
    )
  );

-- TRIGGER: auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, role)
  values (
    new.id,
    new.email,
    case
      when new.email = 'hello@ivvlyn.ai'
      then 'admin'
      else 'client'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure handle_new_user();


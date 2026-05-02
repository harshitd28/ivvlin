-- Lightweight agent presence for team inbox (heartbeat from dashboard).
-- App: POST /api/inbox/presence updates profiles.inbox_last_seen_at for the signed-in user.

alter table if exists public.profiles
  add column if not exists inbox_last_seen_at timestamptz;

create index if not exists profiles_client_inbox_seen_idx
  on public.profiles (client_id, inbox_last_seen_at desc)
  where inbox_last_seen_at is not null;

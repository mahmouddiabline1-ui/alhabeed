create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active' check (status in ('active','locked','deleted')),
  locale text not null default 'ar-EG',
  age_band text not null default 'unknown' check (age_band in ('unknown','under_age','adult')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists auth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider in ('apple','google','email')),
  provider_subject text not null,
  created_at timestamptz not null default now(),
  unique (provider,provider_subject)
);

create table if not exists profiles (
  user_id uuid primary key references users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 24),
  selected_character_id text,
  frame_id text,
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  device_id text not null,
  refresh_token_hash bytea not null unique,
  family_id uuid not null,
  expires_at timestamptz not null,
  rotated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_active_idx on sessions(user_id,expires_at) where revoked_at is null;

create table if not exists live_room_snapshots (
  code char(6) primary key,
  version integer not null check (version > 0),
  state jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists live_room_snapshots_expiry_idx on live_room_snapshots(expires_at);

create table if not exists game_results (
  id uuid primary key default gen_random_uuid(),
  room_code char(6) not null,
  content_version text not null,
  result jsonb not null,
  anti_cheat_flags jsonb not null default '[]'::jsonb,
  finished_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target_type text not null,
  target_id text,
  request_id text,
  ip_prefix text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
revoke update, delete on audit_logs from public;

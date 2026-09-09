create table if not exists consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  device_id text,
  consent_version text not null,
  region text,
  age_band text not null check (age_band in ('unknown','under_age','adult')),
  personalized_ads boolean not null default false,
  analytics boolean not null default false,
  created_at timestamptz not null default now(),
  check (user_id is not null or device_id is not null)
);

create table if not exists rewarded_ad_events (
  provider text not null,
  transaction_id text not null,
  user_id uuid not null references users(id),
  resource_type text not null,
  resource_id text not null,
  verified_at timestamptz not null,
  expires_at timestamptz not null,
  primary key(provider,transaction_id)
);

create table if not exists remote_config (
  key text primary key,
  value jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

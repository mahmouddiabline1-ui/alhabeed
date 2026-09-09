create table if not exists products (
  sku text primary key,
  type text not null check (type in ('vip','pack','character','cosmetic')),
  resource_id text not null,
  status text not null default 'draft' check (status in ('draft','active','retired')),
  platform_mappings jsonb not null default '{}'::jsonb,
  metadata_version integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('apple','google','web')),
  provider_transaction_id text not null,
  original_transaction_id text not null,
  user_id uuid not null references users(id),
  sku text not null references products(sku),
  state text not null,
  created_at timestamptz not null default now(),
  unique(provider,provider_transaction_id)
);

create table if not exists purchase_events (
  id bigint generated always as identity primary key,
  provider text not null,
  provider_event_id text not null,
  provider_transaction_id text not null,
  state text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  payload_digest bytea not null,
  unique(provider,provider_event_id)
);
revoke update, delete on purchase_events from public;

create table if not exists entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  resource_type text not null check (resource_type in ('vip','pack','character','cosmetic')),
  resource_id text not null,
  source_provider text not null,
  source_transaction_id text not null,
  valid_until timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,resource_type,resource_id,source_provider,source_transaction_id)
);
create index if not exists entitlements_active_idx on entitlements(user_id,resource_type,resource_id) where revoked_at is null;

create table if not exists webhook_inbox (
  provider text not null,
  event_id text not null,
  payload_digest bytea not null,
  state text not null default 'received',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  primary key(provider,event_id)
);

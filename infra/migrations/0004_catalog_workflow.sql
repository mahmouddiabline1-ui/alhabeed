create table if not exists packs (
  id text primary key,
  slug text not null unique,
  title text not null,
  access_tier text not null check (access_tier in ('free','vip','purchase')),
  publish_state text not null default 'draft',
  created_at timestamptz not null default now()
);
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),pack_id text not null references packs(id),mode text not null,
  prompt text not null,normalized_prompt text not null,answer text not null,explanation text not null,
  source_url text,review_state text not null default 'draft',reviewer_id uuid references users(id),reviewed_at timestamptz,
  content_warnings text[] not null default '{}',locale text not null default 'ar-EG',difficulty smallint,
  unique(pack_id,normalized_prompt)
);
create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),storage_key text not null unique,digest bytea not null unique,
  license text not null,source_url text,attribution text,width integer not null,height integer not null,created_at timestamptz not null default now()
);
create table if not exists pack_versions (
  pack_id text not null references packs(id),version integer not null,payload jsonb not null,
  publisher_id uuid not null references users(id),published_at timestamptz not null default now(),primary key(pack_id,version)
);
revoke update,delete on pack_versions from public;

create table if not exists admin_roles (
  user_id uuid not null references users(id),role text not null check (role in ('editor','reviewer','publisher','support','admin')),
  granted_by uuid references users(id),granted_at timestamptz not null default now(),revoked_at timestamptz,primary key(user_id,role)
);
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),reporter_id uuid references users(id),target_type text not null,
  target_id text not null,reason text not null,status text not null default 'open',assigned_to uuid references users(id),
  created_at timestamptz not null default now(),resolved_at timestamptz
);
create index if not exists reports_queue_idx on reports(status,created_at) where status in ('open','reviewing');

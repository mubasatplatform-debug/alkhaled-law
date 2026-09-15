create table if not exists staff_users (
  user_id text primary key,
  name text not null default '',
  created_at timestamptz not null default now()
);

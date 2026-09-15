create table if not exists concierge_messages (
  id text primary key,
  user_id text not null,
  role text not null,
  content text not null,
  booked_json text,
  created_at timestamptz not null default now()
);
create index if not exists concierge_messages_user_idx
  on concierge_messages (user_id, created_at);

create table if not exists client_bookings (
  id text primary key,
  user_id text not null,
  date text not null,
  start_min integer not null,
  duration_min integer not null,
  kind text not null,
  status text not null,
  title text not null,
  summary text,
  created_at timestamptz not null default now()
);
create index if not exists client_bookings_user_idx
  on client_bookings (user_id, date, start_min);

create table if not exists office_launch (
  user_id text primary key,
  hours_ok boolean not null default false,
  public_ok boolean not null default false,
  voice_ok boolean not null default false,
  video_ok boolean not null default false,
  reminders_on boolean not null default false,
  updated_at timestamptz not null default now()
);

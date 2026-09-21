-- Office tasks were kept in the browser's memory store, so they vanished on a
-- reload and were never shared between staff devices. They live here now.
create table if not exists office_tasks (
  id text primary key,
  title text not null check (char_length(title) between 1 and 200),
  done boolean not null default false,
  created_by text not null,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create index if not exists office_tasks_list_idx on office_tasks (done, created_at desc);

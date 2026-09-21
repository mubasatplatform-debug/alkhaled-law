-- Working hours were hard-coded (Sun–Thu, 09:00–17:00, 15-minute gap) in the
-- scheduler, the calendar, the assistant's prompt and several page texts. One
-- row now holds them so the office can change them from its settings page.
create table if not exists office_hours (
  id smallint primary key default 1 check (id = 1),
  work_days smallint[] not null
    check (cardinality(work_days) between 1 and 7
           and work_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  start_min integer not null,
  end_min integer not null,
  buffer_min integer not null check (buffer_min in (0, 10, 15, 30)),
  updated_by text,
  updated_at timestamptz not null default now(),
  check (start_min >= 0 and end_min <= 1440 and end_min - start_min >= 60),
  check (start_min % 30 = 0 and end_min % 30 = 0)
);

insert into office_hours (id, work_days, start_min, end_min, buffer_min)
values (1, array[0, 1, 2, 3, 4]::smallint[], 540, 1020, 15)
on conflict (id) do nothing;

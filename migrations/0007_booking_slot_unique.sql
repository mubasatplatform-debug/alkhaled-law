-- Two confirmations of the same slot could both pass: insertBooking checks
-- availability with a select and then inserts, so two requests that interleave
-- between the two statements both see a free slot and both write. The database
-- is the only place that can decide a winner, so make the slot itself unique
-- for every booking that is not cancelled; the loser gets a unique-violation
-- (23505) and is told the time is gone.
create unique index if not exists client_bookings_active_slot_uniq
  on client_bookings (date, start_min)
  where status <> 'cancelled';

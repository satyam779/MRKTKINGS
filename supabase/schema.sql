-- MRKTKings: Let's Connect bookings and the /admin/ page.
--
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste the whole file → Run.
-- It is safe to run again after changes; it only creates or replaces what it defines.
--
-- Who can do what (enforced by Postgres row-level security, not by the website):
--   Visitors (the public key)  add a booking, and see which call times are taken. Nothing else.
--   Admins (signed in)         read, update and delete every booking.
-- A signed-in account is only an admin once it has a row in public.admins (see the end of this file).


-- ---------- Bookings ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- From the form
  name text not null check (char_length(name) between 1 and 200),
  company text check (char_length(company) <= 200),
  email text not null check (char_length(email) between 3 and 320 and position('@' in email) > 1),
  phone text check (char_length(phone) <= 40),
  interests text[] not null default '{}' check (cardinality(interests) <= 20),
  budget text check (char_length(budget) <= 60),
  message text check (char_length(message) <= 5000),
  call_start timestamptz not null,
  call_minutes smallint not null default 30 check (call_minutes between 5 and 240),
  visitor_time_zone text check (char_length(visitor_time_zone) <= 80),

  -- Set by the team on the admin page
  status text not null default 'new' check (status in ('new', 'confirmed', 'completed', 'cancelled')),
  notes text check (char_length(notes) <= 10000)
);

create index if not exists bookings_call_start_idx on public.bookings (call_start);
create index if not exists bookings_created_at_idx on public.bookings (created_at desc);

-- One live booking per slot. A cancelled booking frees its slot.
create unique index if not exists bookings_one_per_slot on public.bookings (call_start) where status <> 'cancelled';

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_touch_updated_at on public.bookings;
create trigger bookings_touch_updated_at
  before update on public.bookings
  for each row execute function public.touch_updated_at();


-- ---------- Admins ----------
-- No policies on this table, so the website can't read or change it. Add admins from the SQL Editor.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;


-- ---------- Access rules ----------
alter table public.bookings enable row level security;

-- Visitors may only add rows. Taking away the rest as well means the bookings stay private even if
-- row-level security were ever switched off by mistake.
revoke all on public.bookings from anon;
grant insert on public.bookings to anon;
grant select, insert, update, delete on public.bookings to authenticated;

drop policy if exists "Visitors can book a call" on public.bookings;
create policy "Visitors can book a call" on public.bookings
  for insert to anon, authenticated
  with check (
    status = 'new'
    and notes is null
    and call_start > now()
    and call_start < now() + interval '120 days'
  );

drop policy if exists "Admins can read bookings" on public.bookings;
create policy "Admins can read bookings" on public.bookings
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings" on public.bookings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete bookings" on public.bookings;
create policy "Admins can delete bookings" on public.bookings
  for delete to authenticated
  using ((select public.is_admin()));


-- ---------- Taken slots ----------
-- The booking form hides times that are already booked. This returns only the times, never who booked them.
create or replace function public.taken_slots(from_time timestamptz, to_time timestamptz)
returns setof timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select call_start
  from public.bookings
  where status <> 'cancelled'
    and call_start >= from_time
    and call_start < least(to_time, from_time + interval '120 days')
  order by call_start;
$$;
revoke all on function public.taken_slots(timestamptz, timestamptz) from public;
grant execute on function public.taken_slots(timestamptz, timestamptz) to anon, authenticated;


-- ---------- Live updates ----------
-- New bookings appear on the admin page without a refresh.
do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception
  when duplicate_object then null;
end;
$$;


-- ---------- Adding an admin ----------
-- 1. Authentication → Users → Add user → Create new user. Enter their email and a password, and tick
--    "Auto Confirm User".
-- 2. Run the lines below with that email (remove the leading dashes first):
--
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'name@example.com'
-- on conflict do nothing;
--
-- To remove an admin: delete from public.admins where user_id = (select id from auth.users where email = 'name@example.com');

create extension if not exists pgcrypto;

create table if not exists public.rehearsals (
  id uuid primary key default gen_random_uuid(),
  title text
   not null,
  rehearsal_date date,
  rehearsal_start_time time,
  location text,
  status text not null default 'planned' check (status in ('planned', 'draft', 'confirmed', 'completed')),
  drive_url text,
  created_at timestamptz not null default now()
);

alter table public.rehearsals add column if not exists rehearsal_start_time time;

create table if not exists public.performances (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  performance_date date,
  venue text,
  status text not null default 'planned' check (status in ('planned', 'pending', 'confirmed', 'completed')),
  drive_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.other_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  event_time time,
  location text,
  event_type text not null default 'meeting' check (event_type in ('meeting', 'recording', 'shoot', 'travel', 'other')),
  status text not null default 'planned' check (status in ('planned', 'confirmed', 'completed', 'cancelled')),
  drive_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.band_members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.member_song_lists (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.band_members(id) on delete cascade,
  folder text not null check (folder in ('covers', 'originals', 'songs_im_learning')),
  song_artist text,
  song_title text not null,
  song_url text,
  created_at timestamptz not null default now()
);

alter table public.member_song_lists add column if not exists song_artist text;
alter table public.member_song_lists add column if not exists song_url text;

create table if not exists public.rehearsal_song_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.band_members(id) on delete cascade,
  rehearsal_id uuid not null references public.rehearsals(id) on delete cascade,
  song_title text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.request_approvals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.rehearsal_song_requests(id) on delete cascade,
  approver_member_id uuid not null references public.band_members(id) on delete cascade,
  decision text not null check (decision in ('approved', 'rejected')),
  decided_at timestamptz not null default now(),
  unique (request_id, approver_member_id)
);

create table if not exists public.rehearsal_songs (
  id uuid primary key default gen_random_uuid(),
  rehearsal_id uuid not null references public.rehearsals(id) on delete cascade,
  song_artist text,
  song_title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_setlist_songs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('performance', 'other')),
  event_id uuid not null,
  song_artist text,
  song_title text not null,
  source_member_song_id uuid references public.member_song_lists(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.rehearsal_songs add column if not exists song_artist text;

alter table public.rehearsals enable row level security;
alter table public.performances enable row level security;
alter table public.other_events enable row level security;
alter table public.band_members enable row level security;
alter table public.member_song_lists enable row level security;
alter table public.rehearsal_songs enable row level security;
alter table public.event_setlist_songs enable row level security;
alter table public.rehearsal_song_requests enable row level security;
alter table public.request_approvals enable row level security;

drop policy if exists "enable_read_rehearsals" on public.rehearsals;
drop policy if exists "enable_write_rehearsals" on public.rehearsals;
drop policy if exists "enable_read_performances" on public.performances;
drop policy if exists "enable_write_performances" on public.performances;
drop policy if exists "enable_read_other_events" on public.other_events;
drop policy if exists "enable_write_other_events" on public.other_events;
drop policy if exists "enable_read_band_members" on public.band_members;
drop policy if exists "enable_write_band_members" on public.band_members;
drop policy if exists "enable_read_member_song_lists" on public.member_song_lists;
drop policy if exists "enable_write_member_song_lists" on public.member_song_lists;
drop policy if exists "enable_read_rehearsal_songs" on public.rehearsal_songs;
drop policy if exists "enable_write_rehearsal_songs" on public.rehearsal_songs;
drop policy if exists "enable_read_event_setlist_songs" on public.event_setlist_songs;
drop policy if exists "enable_write_event_setlist_songs" on public.event_setlist_songs;
drop policy if exists "enable_read_rehearsal_song_requests" on public.rehearsal_song_requests;
drop policy if exists "enable_write_rehearsal_song_requests" on public.rehearsal_song_requests;
drop policy if exists "enable_read_request_approvals" on public.request_approvals;
drop policy if exists "enable_write_request_approvals" on public.request_approvals;

create policy "enable_read_rehearsals"
  on public.rehearsals
  for select
  using (true);

create policy "enable_write_rehearsals"
  on public.rehearsals
  for all
  using (true)
  with check (true);

create policy "enable_read_performances"
  on public.performances
  for select
  using (true);

create policy "enable_write_performances"
  on public.performances
  for all
  using (true)
  with check (true);

create policy "enable_read_other_events"
  on public.other_events
  for select
  using (true);

create policy "enable_write_other_events"
  on public.other_events
  for all
  using (true)
  with check (true);

create policy "enable_read_band_members"
  on public.band_members
  for select
  using (true);

create policy "enable_write_band_members"
  on public.band_members
  for all
  using (true)
  with check (true);

create policy "enable_read_member_song_lists"
  on public.member_song_lists
  for select
  using (true);

create policy "enable_write_member_song_lists"
  on public.member_song_lists
  for all
  using (true)
  with check (true);

create policy "enable_read_rehearsal_songs"
  on public.rehearsal_songs
  for select
  using (true);

create policy "enable_write_rehearsal_songs"
  on public.rehearsal_songs
  for all
  using (true)
  with check (true);

create policy "enable_read_event_setlist_songs"
  on public.event_setlist_songs
  for select
  using (true);

create policy "enable_write_event_setlist_songs"
  on public.event_setlist_songs
  for all
  using (true)
  with check (true);

create policy "enable_read_rehearsal_song_requests"
  on public.rehearsal_song_requests
  for select
  using (true);

create policy "enable_write_rehearsal_song_requests"
  on public.rehearsal_song_requests
  for all
  using (true)
  with check (true);

create policy "enable_read_request_approvals"
  on public.request_approvals
  for select
  using (true);

create policy "enable_write_request_approvals"
  on public.request_approvals
  for all
  using (true)
  with check (true);
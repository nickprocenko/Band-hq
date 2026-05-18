-- Chord charts: stores saved Ultimate Guitar tab content per band
create table if not exists public.chord_charts (
  id            uuid primary key default gen_random_uuid(),
  band_id       uuid not null references public.bands(id) on delete cascade,
  ug_tab_id     bigint not null,
  song_name     text not null,
  artist_name   text not null,
  tab_type      text not null default 'Chords',
  content       text not null default '',
  tonality_name text,
  tuning        text,
  capo          int not null default 0,
  difficulty    text,
  rating        numeric(4,2),
  votes         int,
  version       int not null default 1,
  url_web       text,
  applicature   jsonb,
  transposed_from uuid references public.chord_charts(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (band_id, ug_tab_id)
);

alter table public.chord_charts enable row level security;

drop policy if exists "enable_read_chord_charts" on public.chord_charts;
drop policy if exists "enable_write_chord_charts" on public.chord_charts;
create policy "enable_read_chord_charts" on public.chord_charts for select using (true);
create policy "enable_write_chord_charts" on public.chord_charts for all using (true) with check (true);

-- Link setlist/rehearsal/member songs to saved chord charts
alter table public.event_setlist_songs
  add column if not exists chord_chart_id uuid references public.chord_charts(id) on delete set null;

alter table public.rehearsal_songs
  add column if not exists chord_chart_id uuid references public.chord_charts(id) on delete set null;

alter table public.member_song_lists
  add column if not exists chord_chart_id uuid references public.chord_charts(id) on delete set null;

-- Fix band_members: per-band uniqueness instead of global
alter table public.band_members drop constraint if exists band_members_name_key;
alter table public.band_members add constraint if not exists band_members_band_id_name_key unique (band_id, name);

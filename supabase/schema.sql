create extension if not exists pgcrypto;

create table if not exists public.rehearsals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  rehearsal_date date,
  location text,
  status text not null default 'planned' check (status in ('planned', 'draft', 'confirmed', 'completed')),
  drive_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.performances (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  performance_date date,
  venue text,
  status text not null default 'planned' check (status in ('planned', 'pending', 'confirmed', 'completed')),
  drive_url text,
  created_at timestamptz not null default now()
);

alter table public.rehearsals enable row level security;
alter table public.performances enable row level security;

drop policy if exists "Allow read rehearsals" on public.rehearsals;
drop policy if exists "Allow write rehearsals" on public.rehearsals;
drop policy if exists "Allow read performances" on public.performances;
drop policy if exists "Allow write performances" on public.performances;

create policy "Allow read rehearsals"
  on public.rehearsals
  for select
  using (true);

create policy "Allow write rehearsals"
  on public.rehearsals
  for all
  using (true)
  with check (true);

create policy "Allow read performances"
  on public.performances
  for select
  using (true);

create policy "Allow write performances"
  on public.performances
  for all
  using (true)
  with check (true);
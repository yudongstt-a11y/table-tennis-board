create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_zh text not null,
  name_en text,
  date date,
  venue text,
  organiser text,
  table_count integer default 6,
  table_names jsonb default '[]'::jsonb,
  notes text,
  status text default 'not_started' check (status in ('not_started', 'running', 'paused', 'finished')),
  active_break_id uuid null,
  started_at timestamptz null,
  paused_at timestamptz null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  name text not null,
  gender text default 'Other' check (gender in ('Male', 'Female', 'Other')),
  rating integer null,
  rating_note text null,
  categories jsonb default '[]'::jsonb,
  doubles_partner text null,
  needs_doubles_partner boolean default false,
  notes text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tournament_id, name)
);

create table if not exists public.doubles_pairs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  player_a_name text not null,
  player_b_name text not null,
  player_a_id uuid null references public.players(id) on delete set null,
  player_b_id uuid null references public.players(id) on delete set null,
  status text default 'confirmed',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tournament_id, player_a_name, player_b_name)
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  event_id text not null check (event_id in ('singles', 'womens_singles', 'mixed_doubles')),
  name_zh text not null,
  name_en text,
  format text not null check (format in ('round_robin', 'knockout', 'placement')),
  match_format text not null check (match_format in ('best_of_3', 'best_of_5', 'best_of_7')),
  winner_games integer not null,
  default_minutes integer not null,
  stage_order integer default 1,
  table_allocation integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.seedings (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  event_id text not null,
  stage_id uuid references public.stages(id) on delete cascade,
  player_ids jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tournament_id, event_id, stage_id)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  event_id text not null,
  stage_id uuid references public.stages(id) on delete cascade,
  name text not null,
  group_order integer default 1,
  player_ids jsonb default '[]'::jsonb,
  published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  event_id text not null,
  stage_id uuid null references public.stages(id) on delete set null,
  stage_format text null,
  match_format text default 'best_of_5',
  winner_games integer default 3,
  default_minutes integer default 25,
  default_seconds integer default 1500,
  group_id uuid null references public.groups(id) on delete set null,
  round_name text null,
  round_number integer null,
  bracket_round integer null,
  bracket_position integer null,
  table_name text null,
  table_order integer null,
  scheduled_time timestamptz null,
  player_a_id uuid null references public.players(id) on delete set null,
  player_a_name text null,
  player_a_rating integer null,
  player_b_id uuid null references public.players(id) on delete set null,
  player_b_name text null,
  player_b_rating integer null,
  is_bye boolean default false,
  status text default 'Upcoming' check (status in ('Upcoming', 'Playing', 'Finished')),
  score text null,
  winner_side text null check (winner_side is null or winner_side in ('A', 'B')),
  winner_id uuid null,
  loser_id uuid null,
  remaining_seconds integer null,
  started_at timestamptz null,
  countdown_active boolean default false,
  next_match_id uuid null,
  next_slot text null,
  winner_next_match_id uuid null,
  winner_next_slot text null,
  loser_next_match_id uuid null,
  loser_next_slot text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.table_controls (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  table_name text not null,
  time_bank_seconds integer default 0,
  current_match_id uuid null references public.matches(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tournament_id, table_name)
);

create table if not exists public.event_timeline_items (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  time_start text not null,
  time_end text null,
  title_zh text not null,
  title_en text null,
  description_zh text null,
  description_en text null,
  item_order integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.breaks (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  name_zh text not null,
  name_en text,
  after_stage_id uuid null references public.stages(id) on delete set null,
  after_round integer null,
  duration_minutes integer default 30,
  status text default 'scheduled' check (status in ('scheduled', 'active', 'completed')),
  started_at timestamptz null,
  ended_at timestamptz null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
declare t text;
begin
  foreach t in array array[
    'tournaments','players','doubles_pairs','stages','seedings','groups',
    'matches','table_controls','event_timeline_items','breaks'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists public_read on public.%I', t);
    execute format('create policy public_read on public.%I for select using (true)', t);
    -- Temporary for demo admin without Supabase Auth. Before production, replace with authenticated-only write policies.
    execute format('drop policy if exists temporary_anon_write on public.%I', t);
    execute format('create policy temporary_anon_write on public.%I for all using (true) with check (true)', t);
  end loop;
end $$;

insert into public.tournaments (
  slug, name_zh, name_en, date, venue, organiser, table_count, table_names, notes
) values (
  'yulan-cup-2026',
  '2026第二届“玉兰杯”乒乓球大赛',
  '2026 2nd Yulan Cup Table Tennis Tournament',
  '2026-06-06',
  'Wynnum Table Tennis Association, 38 Curtis St, Manly QLD 4179',
  'Star Table Tennis',
  8,
  '["Table 1","Table 2","Table 3","Table 4","Table 5","Table 6","Table 7","Table 8"]'::jsonb,
  ''
) on conflict (slug) do update set
  name_zh = excluded.name_zh,
  name_en = excluded.name_en,
  date = excluded.date,
  venue = excluded.venue,
  organiser = excluded.organiser,
  table_count = excluded.table_count,
  table_names = excluded.table_names;

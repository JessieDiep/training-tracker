-- ── jessprogressing — Supabase schema ──────────────────────────────────────
-- Run this once in your Supabase project → SQL Editor
--
-- IMPORTANT: Before running, go to:
--   Supabase Dashboard → Authentication → Email → Disable "Confirm email"
-- This lets users sign up with any email without inbox access.

-- ── Profiles table ────────────────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid references auth.users on delete cascade primary key,
  name            text not null,
  has_race        boolean default false not null,
  race_date       date,
  race_name       text,
  race_goal       text,
  race_distances  jsonb default '{}',  -- { swim: 500, bike: 25, run: 5 }
  injury_flags    text default 'None',
  training_plan   text,                -- optional freeform weekly plan for coach
  created_at      timestamptz default now() not null
);

alter table profiles enable row level security;

drop policy if exists "Users manage own profile" on profiles;
create policy "Users manage own profile"
  on profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── Workouts table ────────────────────────────────────────────────────────────
create table if not exists workouts (
  id               uuid        default gen_random_uuid() primary key,
  created_at       timestamptz default now()             not null,
  date             date        default current_date      not null,

  user_id          uuid references auth.users,

  discipline       text        not null
    check (discipline in ('swim','bike','run','strength','climb','recover')),

  duration_minutes integer,
  effort           integer     check (effort between 1 and 10),

  -- Discipline-specific data (distance, routes, exercises, etc.)
  details          jsonb       default '{}'             not null,

  notes            text,
  mood             text
);

-- Indexes for fast queries
create index if not exists workouts_date_idx    on workouts (date desc);
create index if not exists workouts_user_id_idx on workouts (user_id);

-- Row Level Security: per-user isolation
alter table workouts enable row level security;

drop policy if exists "public_access"          on workouts;
drop policy if exists "Users manage own workouts" on workouts;
create policy "Users manage own workouts"
  on workouts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Migrate existing data (run AFTER creating your account) ──────────────────
-- 1. Go to Supabase → Authentication → Users, copy your UUID.
-- 2. Uncomment and run the line below, replacing the UUID:
--
-- update workouts set user_id = 'YOUR-UUID-HERE' where user_id is null;

-- ── Optional: sample data ────────────────────────────────────────────────────
-- After creating an account, you can insert sample rows.
-- Set user_id to your UUID from Authentication → Users.
--
-- insert into workouts (user_id, date, discipline, duration_minutes, effort, details, notes)
-- values
--   ('YOUR-UUID-HERE', current_date,     'swim',     50, 7, '{"distance":1800,"location":"Pool","focus":"Endurance"}', null),
--   ('YOUR-UUID-HERE', current_date - 1, 'bike',     60, 6, '{"type":"Endurance","location":"Indoor / Trainer"}',     null),
--   ('YOUR-UUID-HERE', current_date - 2, 'strength', 55, 8, '{"focus":["Glutes","Core"]}',                           'felt strong');

-- ── jessprogressing — Supabase schema ──────────────────────────────────────
-- Run this once in your Supabase project → SQL Editor

create table if not exists workouts (
  id               uuid        default gen_random_uuid() primary key,
  created_at       timestamptz default now()             not null,
  date             date        default current_date      not null,

  discipline       text        not null
    check (discipline in ('swim','bike','run','strength','climb','recover')),

  duration_minutes integer,
  effort           integer     check (effort between 1 and 10),

  -- Discipline-specific data (distance, routes, exercises, etc.)
  details          jsonb       default '{}'             not null,

  notes            text,
  mood             text
);

-- Index for fast recent-workout queries
create index if not exists workouts_date_idx on workouts (date desc);

-- Row Level Security: open access (single-user, no auth needed)
alter table workouts enable row level security;

drop policy if exists "public_access" on workouts;
create policy "public_access"
  on workouts
  for all
  using (true)
  with check (true);

-- ── Optional: sample data to see the app working immediately ────────────────
-- Uncomment and run if you want placeholder data:

/*
insert into workouts (date, discipline, duration_minutes, effort, details, notes)
values
  (current_date,       'swim',     50, 7, '{"distance":1800,"location":"Pool","focus":"Endurance"}', null),
  (current_date - 1,   'bike',     60, 6, '{"type":"Endurance","location":"Indoor / Trainer"}',     null),
  (current_date - 2,   'strength', 55, 8, '{"focus":["Glutes","Core"]}',                            'felt strong'),
  (current_date - 3,   'run',      35, 5, '{"distance":4.2,"surface":"Road","footPain":true}',      'modified session'),
  (current_date - 4,   'recover',  30, 2, '{"types":["Stretch","Foam Roll"]}',                      null),
  (current_date - 7,   'swim',     45, 6, '{"distance":1500,"location":"Pool","focus":"Technique"}',null),
  (current_date - 8,   'climb',    90, 7, '{"location":"Gym","routes":[{"grade":"5.11a","attempts":3,"status":"working"}]}', null),
  (current_date - 9,   'bike',     75, 7, '{"type":"Endurance","location":"Outdoor"}',              null),
  (current_date - 10,  'run',      30, 4, '{"distance":3.5,"surface":"Treadmill","footPain":false}',null),
  (current_date - 11,  'strength', 60, 8, '{"focus":["Glutes","Legs"]}',                           null);
*/

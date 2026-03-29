-- IronPlan Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database.

-- ── Workouts ────────────────────────────────────────────────────────────────

create table if not exists workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  exercises   jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

alter table workouts enable row level security;

create policy "Users can manage their own workouts"
  on workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Workout Logs ─────────────────────────────────────────────────────────────

create table if not exists workout_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  workout_id    uuid not null,
  date          date not null,
  started_at    timestamptz,
  completed_at  timestamptz,
  completed     boolean not null default false,
  exercises     jsonb not null default '[]',
  created_at    timestamptz not null default now()
);

alter table workout_logs enable row level security;

create policy "Users can manage their own workout logs"
  on workout_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists workouts_user_id_idx on workouts(user_id);
create index if not exists workout_logs_user_id_idx on workout_logs(user_id);
create index if not exists workout_logs_workout_id_idx on workout_logs(workout_id);
create index if not exists workout_logs_date_idx on workout_logs(date desc);

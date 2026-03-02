create table if not exists public.agenda_weekly_jobs (
  id bigserial primary key,
  run_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  status text not null check (status in ('queued','running','completed','failed')),
  progress integer not null default 0,
  attempts integer not null default 0,
  max_attempts integer not null default 4,
  next_attempt_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  last_message text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agenda_weekly_jobs_idempotency_idx
  on public.agenda_weekly_jobs (user_id, week_start)
  where status in ('queued','running','completed');

create index if not exists agenda_weekly_jobs_ready_idx
  on public.agenda_weekly_jobs (status, next_attempt_at, created_at);

create table if not exists public.agenda_jobs_status (
  run_id uuid primary key references public.agenda_weekly_jobs(run_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('queued','running','completed','failed')),
  progress integer not null default 0,
  message text,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists agenda_jobs_status_user_idx on public.agenda_jobs_status(user_id, updated_at desc);

alter table public.agenda_weekly_jobs enable row level security;
alter table public.agenda_jobs_status enable row level security;

create policy "agenda_weekly_jobs_select_own" on public.agenda_weekly_jobs
  for select using (auth.uid() = user_id);

create policy "agenda_jobs_status_select_own" on public.agenda_jobs_status
  for select using (auth.uid() = user_id);

do $$ begin
  alter publication supabase_realtime add table public.agenda_jobs_status;
exception when duplicate_object then null;
end $$;

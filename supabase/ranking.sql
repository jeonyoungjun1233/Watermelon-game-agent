create extension if not exists pgcrypto;

create table if not exists public.rankings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nickname text not null,
  best_score integer not null default 0,
  play_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists rankings_best_score_idx
  on public.rankings (best_score desc, updated_at asc);

alter table public.rankings enable row level security;

drop policy if exists "Anyone can read rankings" on public.rankings;
create policy "Anyone can read rankings"
  on public.rankings for select
  using (true);

drop policy if exists "Users can insert own ranking" on public.rankings;
create policy "Users can insert own ranking"
  on public.rankings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own ranking" on public.rankings;
create policy "Users can update own ranking"
  on public.rankings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';

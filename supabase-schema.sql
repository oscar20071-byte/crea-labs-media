create table if not exists public.channels (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 2 and 40),
 description text not null default '' check (char_length(description) <= 160),
 created_at timestamptz not null default now(),
 unique (user_id)
);
alter table public.channels enable row level security;
create policy "Public can read channels" on public.channels for select using (true);
create policy "Users create own channel" on public.channels for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own channel" on public.channels for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own channel" on public.channels for delete to authenticated using (auth.uid() = user_id);

-- Threads: table and messages.thread_id

create table if not exists public.threads (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  root_message_id uuid not null references public.messages(id) on delete cascade,
  title text not null,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now() not null,
  locked_at timestamptz,
  archived_at timestamptz
);

create index if not exists idx_threads_channel_id on public.threads(channel_id);

alter table public.threads enable row level security;

create policy "Channel members can view threads"
  on public.threads for select
  using (
    exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = threads.channel_id and sm.user_id = auth.uid()
    )
  );

create policy "Channel members can create threads"
  on public.threads for insert
  with check (
    created_by_user_id = auth.uid()
    and exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = channel_id and sm.user_id = auth.uid()
    )
  );

create policy "Server admins can update threads"
  on public.threads for update
  using (
    exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = threads.channel_id and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin')
    )
  );

create policy "Server admins can delete threads"
  on public.threads for delete
  using (
    exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = threads.channel_id and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin')
    )
  );

-- Messages: add thread_id for thread replies
alter table public.messages
  add column if not exists thread_id uuid references public.threads(id) on delete cascade;

create index if not exists idx_messages_thread_id on public.messages(thread_id);

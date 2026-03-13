-- Admin vs Channel Moderator: channel creator (moderator), ban_requests, RLS for channel creation

-- Channels: who created it (channel moderator)
alter table public.channels
  add column if not exists created_by_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_channels_created_by on public.channels(server_id, created_by_user_id);

-- Allow any server member to create channels; creator must set created_by_user_id = self
drop policy if exists "Server admins can create channels" on public.channels;
create policy "Server members can create channels"
  on public.channels for insert
  with check (
    created_by_user_id = auth.uid()
    and exists (
      select 1 from public.server_members
      where server_id = channels.server_id and user_id = auth.uid()
    )
  );

-- Helper: is this user a channel moderator in this server (created at least one channel)?
create or replace function public.is_channel_moderator(p_server_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.channels
    where server_id = p_server_id and created_by_user_id = p_user_id
  );
$$;

-- Ban requests: moderators suggest; admins approve or dismiss
create table if not exists public.ban_requests (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  requested_by_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz default now() not null,
  resolved_at timestamptz,
  resolved_by_user_id uuid references auth.users(id) on delete set null
);

create index if not exists idx_ban_requests_server_status on public.ban_requests(server_id, status);

alter table public.ban_requests enable row level security;

-- Channel moderators can insert (suggest ban)
create policy "Channel moderators can insert ban_requests"
  on public.ban_requests for insert
  with check (
    requested_by_user_id = auth.uid()
    and public.is_channel_moderator(server_id, auth.uid())
  );

-- Requesting moderator can view own requests; admins can view all
create policy "Requesters and admins can view ban_requests"
  on public.ban_requests for select
  using (
    requested_by_user_id = auth.uid()
    or public.is_server_admin(server_id, auth.uid())
  );

-- Only admins can update (resolve)
create policy "Server admins can update ban_requests"
  on public.ban_requests for update
  using (public.is_server_admin(server_id, auth.uid()))
  with check (public.is_server_admin(server_id, auth.uid()));

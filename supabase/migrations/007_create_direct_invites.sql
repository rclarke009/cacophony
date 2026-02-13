-- Direct invites: user-to-user server invitations (in-app, no link)
create table public.direct_invites (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by_user_id uuid not null references auth.users(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now() not null,
  unique(server_id, invited_user_id)
);

alter table public.direct_invites enable row level security;

-- SELECT: invitee or inviter can read
create policy "Invitees and inviters can view direct invites"
  on public.direct_invites for select
  using (invited_user_id = auth.uid() or invited_by_user_id = auth.uid());

-- INSERT: only server admins can create invites
create policy "Server admins can create direct invites"
  on public.direct_invites for insert
  with check (
    invited_by_user_id = auth.uid()
    and public.is_server_admin(server_id, auth.uid())
  );

-- UPDATE: only invitee can update (to accept/decline)
create policy "Invitees can update their direct invites"
  on public.direct_invites for update
  using (invited_user_id = auth.uid());

create index idx_direct_invites_invited_user_id on public.direct_invites(invited_user_id);

-- Enable Realtime for live invite notifications
ALTER PUBLICATION supabase_realtime ADD TABLE direct_invites;

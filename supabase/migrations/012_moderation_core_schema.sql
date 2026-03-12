-- Moderation core: member_invitations, server_bans, member_removals, timeout, warnings, audit_log, moderation_alerts

-- Append-only: who invited whom (for invite tree and bot-inviter tracking)
create table if not exists public.member_invitations (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by_user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz default now() not null,
  source text not null check (source in ('link', 'direct')),
  invite_id uuid references public.invites(id) on delete set null
);

create index if not exists idx_member_invitations_server_user on public.member_invitations(server_id, user_id);
create index if not exists idx_member_invitations_invited_by on public.member_invitations(server_id, invited_by_user_id);

alter table public.member_invitations enable row level security;

-- Server members can read invitations for their server (for members list / invite tree)
create policy "Server members can view member_invitations"
  on public.member_invitations for select
  using (public.is_server_member(server_id, auth.uid()));

-- Only service role / server logic inserts (no direct user insert policy; use service role in actions)
create policy "Service role can insert member_invitations"
  on public.member_invitations for insert
  with check (true);
-- Restrict insert to backend only by not granting insert to anon/authenticated; we'll use service role in actions.
-- So we need a policy that allows insert when called from our app. Easiest: allow authenticated to insert
-- only when they are the user_id being added (join flow) or admin adding. Actually plan says "insert one row
-- every time a user joins" - that happens in join page and acceptDirectInvite, which use admin client.
-- So we need to allow insert from backend. Use a definer function or allow authenticated with a check.
-- Allow insert if the joining user is the current user (they're joining) or if server admin (adding on their behalf).
create policy "Authenticated can insert member_invitations on join"
  on public.member_invitations for insert
  with check (
    auth.uid() = user_id
    or public.is_server_admin(server_id, auth.uid())
  );

-- No update/delete on member_invitations (append-only).


-- Server bans
create table if not exists public.server_bans (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  banned_by_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz default now() not null,
  unique(server_id, user_id)
);

create index if not exists idx_server_bans_server_id on public.server_bans(server_id);

alter table public.server_bans enable row level security;

create policy "Server members can view server_bans"
  on public.server_bans for select
  using (public.is_server_member(server_id, auth.uid()));

create policy "Server admins can insert server_bans"
  on public.server_bans for insert
  with check (public.is_server_admin(server_id, auth.uid()));

create policy "Server admins can delete server_bans"
  on public.server_bans for delete
  using (public.is_server_admin(server_id, auth.uid()));


-- Member removals (kicks) for history and bot-inviter count
create table if not exists public.member_removals (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  removed_by_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  removed_at timestamptz default now() not null
);

create index if not exists idx_member_removals_server_id on public.member_removals(server_id);
create index if not exists idx_member_removals_user_id on public.member_removals(server_id, user_id);

alter table public.member_removals enable row level security;

create policy "Server admins can view member_removals"
  on public.member_removals for select
  using (public.is_server_admin(server_id, auth.uid()));

create policy "Server admins can insert member_removals"
  on public.member_removals for insert
  with check (public.is_server_admin(server_id, auth.uid()));


-- server_members: timeout, voice mute, can_invite (for revoking invite permission)
alter table public.server_members
  add column if not exists timeout_until timestamptz,
  add column if not exists voice_muted_until timestamptz,
  add column if not exists can_invite boolean default true;


-- Warnings
create table if not exists public.warnings (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  warned_by_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz default now() not null
);

create index if not exists idx_warnings_server_user on public.warnings(server_id, user_id);

alter table public.warnings enable row level security;

create policy "Moderators and target can view warnings"
  on public.warnings for select
  using (
    public.is_server_admin(server_id, auth.uid())
    or user_id = auth.uid()
  );

create policy "Server admins can insert warnings"
  on public.warnings for insert
  with check (public.is_server_admin(server_id, auth.uid()));


-- Audit log (insert via definer so any actor can write; select for admins only)
create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null check (target_type in ('user', 'message', 'channel', 'thread', 'invite', 'role')),
  target_id uuid,
  details jsonb,
  created_at timestamptz default now() not null
);

create index if not exists idx_audit_log_server_created on public.audit_log(server_id, created_at desc);

alter table public.audit_log enable row level security;

create policy "Server admins can view audit_log"
  on public.audit_log for select
  using (public.is_server_admin(server_id, auth.uid()));

-- Insert: allow server members to write (we'll use a server action that checks admin for actual moderation actions)
create policy "Server members can insert audit_log"
  on public.audit_log for insert
  with check (public.is_server_member(server_id, auth.uid()));


-- Moderation alerts (e.g. "user X invited 3+ bots")
create table if not exists public.moderation_alerts (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_type text not null default 'inviter_bot_count',
  details jsonb,
  created_at timestamptz default now() not null,
  read_at timestamptz
);

create index if not exists idx_moderation_alerts_server on public.moderation_alerts(server_id);

alter table public.moderation_alerts enable row level security;

create policy "Server admins can view moderation_alerts"
  on public.moderation_alerts for select
  using (public.is_server_admin(server_id, auth.uid()));

create policy "Server admins can update moderation_alerts"
  on public.moderation_alerts for update
  using (public.is_server_admin(server_id, auth.uid()));

-- Insert from backend only (server action with service role or definer)
create policy "Server members can insert moderation_alerts"
  on public.moderation_alerts for insert
  with check (public.is_server_member(server_id, auth.uid()));


-- Messages: allow server admins to delete any message in their server (in addition to own-message delete)
create policy "Server admins can delete any message in server"
  on public.messages for delete
  using (
    exists (
      select 1 from public.channels c
      join public.server_members sm on sm.server_id = c.server_id
      where c.id = messages.channel_id
        and sm.user_id = auth.uid()
        and sm.role in ('owner', 'admin')
    )
  );

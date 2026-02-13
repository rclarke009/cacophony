-- Cacophany Database Schema
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles: extends auth.users with display info
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Servers (like Discord guilds)
create table public.servers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  icon_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Channels belong to servers
create table public.channels (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  name text not null,
  type text default 'text' check (type in ('text', 'voice')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Server members
create table public.server_members (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now() not null,
  unique(server_id, user_id)
);

-- Messages
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Invites (for invitation-only signup)
create table public.invites (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  used_by_user_id uuid references auth.users(id) on delete set null,
  max_uses int default 1,
  uses int default 0,
  expires_at timestamptz,
  created_at timestamptz default now() not null,
  used_at timestamptz
);

-- Attachments (optional, for file uploads)
create table public.attachments (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid not null references public.messages(id) on delete cascade,
  file_path text not null,
  file_type text check (file_type in ('image', 'video', 'file')),
  created_at timestamptz default now() not null
);

-- Indexes for common queries
create index idx_channels_server_id on public.channels(server_id);
create index idx_messages_channel_id on public.messages(channel_id);
create index idx_messages_created_at on public.messages(created_at);
create index idx_server_members_server_id on public.server_members(server_id);
create index idx_server_members_user_id on public.server_members(user_id);
create index idx_invites_code on public.invites(code);

-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.servers enable row level security;
alter table public.channels enable row level security;
alter table public.server_members enable row level security;
alter table public.messages enable row level security;
alter table public.invites enable row level security;
alter table public.attachments enable row level security;

-- RLS: Profiles — users can read all, update own
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- RLS: Servers — members can read
create policy "Server members can view servers"
  on public.servers for select
  using (
    exists (
      select 1 from public.server_members
      where server_id = servers.id and user_id = auth.uid()
    )
  );

create policy "Authenticated users can create servers"
  on public.servers for insert with check (auth.uid() is not null);

create policy "Server owners can update"
  on public.servers for update
  using (
    exists (
      select 1 from public.server_members
      where server_id = servers.id and user_id = auth.uid() and role = 'owner'
    )
  );

-- RLS: Channels — members of server can read
create policy "Server members can view channels"
  on public.channels for select
  using (
    exists (
      select 1 from public.server_members
      where server_id = channels.server_id and user_id = auth.uid()
    )
  );

create policy "Server admins can create channels"
  on public.channels for insert
  with check (
    exists (
      select 1 from public.server_members
      where server_id = channels.server_id and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- Helper: check membership without triggering RLS (avoids infinite recursion)
create or replace function public.is_server_member(p_server_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.server_members
    where server_id = p_server_id and user_id = p_user_id
  );
$$;

create or replace function public.is_server_admin(p_server_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.server_members
    where server_id = p_server_id and user_id = p_user_id
      and role in ('owner', 'admin')
  );
$$;

-- RLS: Server members — members can see other members (uses helper to avoid recursion)
create policy "Members can view server members"
  on public.server_members for select
  using (public.is_server_member(server_id, auth.uid()));

create policy "Server owners can add members"
  on public.server_members for insert
  with check (public.is_server_admin(server_id, auth.uid()));

-- RLS: Messages — members can read/write
create policy "Channel members can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.server_members sm
      join public.channels c on c.server_id = sm.server_id
      where c.id = messages.channel_id and sm.user_id = auth.uid()
    )
  );

create policy "Channel members can send messages"
  on public.messages for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.server_members sm
      join public.channels c on c.server_id = sm.server_id
      where c.id = messages.channel_id and sm.user_id = auth.uid()
    )
  );

create policy "Users can update own messages"
  on public.messages for update using (auth.uid() = user_id);

create policy "Users can delete own messages"
  on public.messages for delete using (auth.uid() = user_id);

-- RLS: Invites — creators can manage; validation uses service role (server-side only)
create policy "Invite creators can manage invites"
  on public.invites for all
  using (created_by_user_id = auth.uid());

-- RLS: Attachments — same as messages
create policy "Channel members can view attachments"
  on public.attachments for select
  using (
    exists (
      select 1 from public.messages m
      join public.channels c on c.id = m.channel_id
      join public.server_members sm on sm.server_id = c.server_id
      where m.id = attachments.message_id and sm.user_id = auth.uid()
    )
  );

create policy "Channel members can upload attachments"
  on public.attachments for insert
  with check (
    exists (
      select 1 from public.messages m
      join public.channels c on c.id = m.channel_id
      join public.server_members sm on sm.server_id = c.server_id
      where m.id = attachments.message_id and sm.user_id = auth.uid()
    )
  );

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage buckets (run separately if needed, or via Dashboard)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false);

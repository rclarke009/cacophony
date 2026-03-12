-- AutoMod rules, slowmode, server moderation settings, reports

-- AutoMod rules (per server)
create table if not exists public.automod_rules (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  name text not null,
  type text not null check (type in ('spam', 'harmful_links', 'profanity', 'keywords')),
  config jsonb default '{}',
  action text not null check (action in ('block', 'quarantine', 'flag')),
  created_at timestamptz default now() not null
);

create index if not exists idx_automod_rules_server_id on public.automod_rules(server_id);

alter table public.automod_rules enable row level security;

create policy "Server members can view automod_rules"
  on public.automod_rules for select
  using (public.is_server_member(server_id, auth.uid()));

create policy "Server admins can insert automod_rules"
  on public.automod_rules for insert
  with check (public.is_server_admin(server_id, auth.uid()));

create policy "Server admins can update automod_rules"
  on public.automod_rules for update
  using (public.is_server_admin(server_id, auth.uid()));

create policy "Server admins can delete automod_rules"
  on public.automod_rules for delete
  using (public.is_server_admin(server_id, auth.uid()));


-- Slowmode: add column to channels
alter table public.channels
  add column if not exists slowmode_seconds int default 0 check (slowmode_seconds >= 0);


-- Server moderation / safety settings (optional table to keep servers table smaller)
create table if not exists public.server_moderation_settings (
  server_id uuid primary key references public.servers(id) on delete cascade,
  verification_level text default 'none' check (verification_level in ('none', 'low', 'medium', 'high')),
  explicit_media_filter text default 'off' check (explicit_media_filter in ('off', 'warn', 'block')),
  updated_at timestamptz default now() not null
);

alter table public.server_moderation_settings enable row level security;

create policy "Server members can view server_moderation_settings"
  on public.server_moderation_settings for select
  using (public.is_server_member(server_id, auth.uid()));

create policy "Server admins can manage server_moderation_settings"
  on public.server_moderation_settings for all
  using (public.is_server_admin(server_id, auth.uid()))
  with check (public.is_server_admin(server_id, auth.uid()));


-- Reports (user/message reports for mods)
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  server_id uuid not null references public.servers(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  reported_message_id uuid references public.messages(id) on delete set null,
  reason text,
  status text default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamptz default now() not null,
  resolved_at timestamptz,
  resolved_by_user_id uuid references auth.users(id) on delete set null
);

create index if not exists idx_reports_server_status on public.reports(server_id, status);

alter table public.reports enable row level security;

create policy "Reporters can view own reports"
  on public.reports for select
  using (reporter_user_id = auth.uid());

create policy "Server admins can view all reports"
  on public.reports for select
  using (public.is_server_admin(server_id, auth.uid()));

create policy "Server members can create reports"
  on public.reports for insert
  with check (
    reporter_user_id = auth.uid()
    and public.is_server_member(server_id, auth.uid())
  );

create policy "Server admins can update reports"
  on public.reports for update
  using (public.is_server_admin(server_id, auth.uid()));

-- Ensure server_moderation_settings exists in production

-- Server moderation / safety settings
create table if not exists public.server_moderation_settings (
  server_id uuid primary key references public.servers(id) on delete cascade,
  verification_level text default 'none' check (verification_level in ('none', 'low', 'medium', 'high')),
  explicit_media_filter text default 'off' check (explicit_media_filter in ('off', 'warn', 'block')),
  updated_at timestamptz default now() not null
);

alter table public.server_moderation_settings enable row level security;

-- Allow server members to view settings
drop policy if exists "Server members can view server_moderation_settings" on public.server_moderation_settings;
create policy "Server members can view server_moderation_settings"
  on public.server_moderation_settings for select
  using (public.is_server_member(server_id, auth.uid()));

-- Allow server admins to manage settings
drop policy if exists "Server admins can manage server_moderation_settings" on public.server_moderation_settings;
create policy "Server admins can manage server_moderation_settings"
  on public.server_moderation_settings for all
  using (public.is_server_admin(server_id, auth.uid()))
  with check (public.is_server_admin(server_id, auth.uid()));


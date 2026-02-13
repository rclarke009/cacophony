-- Fix: infinite recursion in server_members RLS policies
-- Run this in Supabase SQL Editor if you're seeing "infinite recursion detected in policy for relation 'server_members'"

-- Drop the problematic policies first
drop policy if exists "Members can view server members" on public.server_members;
drop policy if exists "Server owners can add members" on public.server_members;

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

-- Recreate policies using the helpers
create policy "Members can view server members"
  on public.server_members for select
  using (public.is_server_member(server_id, auth.uid()));

create policy "Server owners can add members"
  on public.server_members for insert
  with check (public.is_server_admin(server_id, auth.uid()));

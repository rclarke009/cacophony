-- Seed: Create default "Home" server + general channel
-- Run this in Supabase SQL Editor AFTER schema.sql and AFTER your first user signs up.
--
-- 1. Get your user ID from Supabase Dashboard → Authentication → Users
-- 2. Replace 'YOUR_USER_ID_HERE' below with that UUID
-- 3. Execute the block

do $$
declare
  v_server_id uuid;
  v_user_id uuid := 'YOUR_USER_ID_HERE';
begin
  -- Create Home server
  insert into public.servers (name)
  values ('Home')
  returning id into v_server_id;

  -- Add you as owner
  insert into public.server_members (server_id, user_id, role)
  values (v_server_id, v_user_id, 'owner');

  -- Create general channel
  insert into public.channels (server_id, name, type)
  values (v_server_id, 'general', 'text');

  raise notice 'Created Home server (id: %) with general channel', v_server_id;
end $$;

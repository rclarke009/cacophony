-- Seed: Create default "Home" server + general channel + invite codes
-- Run this in Supabase SQL Editor AFTER schema.sql.
--
-- Signups are invite-only. To bootstrap:
-- 1. Create your first user in Supabase Dashboard → Authentication → Users → Add user
-- 2. Get that user's ID from the Users list
-- 3. Replace 'YOUR_USER_ID_HERE' below with that UUID
-- 4. Execute the block
--
-- This creates: Home server, general channel, and invite code "cacophany-welcome" (10 uses).
-- Share the invite link: https://yourapp.com/signup?invite=cacophany-welcome

do $$
declare
  v_server_id uuid;
  v_user_id uuid := 'YOUR_USER_ID_HERE';  -- Auth → Users → copy your user UUID
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

  -- Create invite code for inviting friends (10 uses)
  insert into public.invites (code, created_by_user_id, max_uses)
  values ('cacophany-welcome', v_user_id, 10);

  raise notice 'Created Home server (id: %) with general channel and invite code cacophany-welcome', v_server_id;
end $$;

#!/usr/bin/env node
/**
 * Create a one-time invite link for the "Heavy Use Test Server" (seed user's server)
 * so your main user can join and see the stress-test channel.
 *
 * Run after seed-heavy-use.mjs. Uses service role.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/invite-heavy-use.mjs
 *   Optional: NEXT_PUBLIC_APP_URL=https://www.cacophany.us  (defaults to http://localhost:3000)
 *   Optional: max uses = second arg, e.g. node scripts/invite-heavy-use.mjs 5
 */

import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const maxUses = Math.max(1, parseInt(process.argv[2] || "10", 10) || 10);
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const supabase = createClient(url, key, { auth: { persistSession: false } });

const SERVER_NAME = "Heavy Use Test Server";

const { data: server, error: serverError } = await supabase
  .from("servers")
  .select("id")
  .eq("name", SERVER_NAME)
  .maybeSingle();

if (serverError) {
  console.error(serverError);
  process.exit(1);
}

if (!server) {
  console.error("Heavy Use Test Server not found. Run seed:heavy-use first.");
  process.exit(1);
}

const { data: owner, error: ownerError } = await supabase
  .from("server_members")
  .select("user_id")
  .eq("server_id", server.id)
  .eq("role", "owner")
  .limit(1)
  .single();

if (ownerError || !owner?.user_id) {
  console.error("Could not find server owner.", ownerError || "");
  process.exit(1);
}

let code = nanoid(8);
const { data: invite, error: inviteError } = await supabase
  .from("invites")
  .insert({
    code,
    server_id: server.id,
    created_by_user_id: owner.user_id,
    max_uses: maxUses,
  })
  .select("code")
  .single();

if (inviteError) {
  if (inviteError.code === "23505") {
    code = nanoid(8);
    const retry = await supabase
      .from("invites")
      .insert({
        code,
        server_id: server.id,
        created_by_user_id: owner.user_id,
        max_uses: maxUses,
      })
      .select("code")
      .single();
    if (retry.error) {
      console.error(retry.error);
      process.exit(1);
    }
  } else {
    console.error(inviteError);
    process.exit(1);
  }
}

const joinUrl = `${baseUrl.replace(/\/$/, "")}/join/${invite?.code ?? code}`;
console.log("MYDEBUG →", "Invite created for Heavy Use Test Server");
console.log("Join URL (use with your main user):", joinUrl);
console.log("Max uses:", maxUses);

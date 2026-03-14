#!/usr/bin/env node
/**
 * List members of a server with role and inviter. Uses service role.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/admin-list-members.mjs <SERVER_ID>
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const serverId = process.argv[2];
if (!serverId) {
  console.error("Usage: node scripts/admin-list-members.mjs <SERVER_ID>");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: members, error: membersError } = await admin
  .from("server_members")
  .select("user_id, role, joined_at")
  .eq("server_id", serverId)
  .order("joined_at", { ascending: true });

if (membersError) {
  console.error(membersError);
  process.exit(1);
}

if (!members?.length) {
  console.log("No members.");
  process.exit(0);
}

const userIds = members.map((m) => m.user_id);
const { data: invitations } = await admin
  .from("member_invitations")
  .select("user_id, invited_by_user_id")
  .eq("server_id", serverId);
const inviterByUser = new Map((invitations ?? []).map((i) => [i.user_id, i.invited_by_user_id]));
const inviterIds = [...new Set(inviterByUser.values())];
const { data: profiles } = await admin.from("profiles").select("id, username").in("id", userIds.concat(inviterIds));
const usernameById = new Map((profiles ?? []).map((p) => [p.id, p.username]));

console.log(`Members for server ${serverId}:`);
for (const m of members) {
  const inviterId = inviterByUser.get(m.user_id);
  const inviterName = inviterId ? usernameById.get(inviterId) ?? inviterId : null;
  const name = usernameById.get(m.user_id) ?? m.user_id.slice(0, 8);
  console.log(`  ${m.user_id}  ${name}  ${m.role}  invited_by: ${inviterName ?? "—"}`);
}

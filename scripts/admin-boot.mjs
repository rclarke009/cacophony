#!/usr/bin/env node
/**
 * Kick or ban a user from a server. Uses service role.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/admin-boot.mjs <SERVER_ID> <USER_ID> kick
 *   ... node scripts/admin-boot.mjs <SERVER_ID> <USER_ID> ban [reason]
 *
 * For "ban" the script inserts server_bans, member_removals, and deletes server_members.
 * For "kick" it only inserts member_removals and deletes server_members.
 * You must pass a valid actor user ID as BOOT_ACTOR_USER_ID (e.g. your platform admin UUID) for audit_log.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const actorUserId = process.env.BOOT_ACTOR_USER_ID;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!actorUserId) {
  console.error("Set BOOT_ACTOR_USER_ID (e.g. your platform admin UUID) for audit_log");
  process.exit(1);
}

const serverId = process.argv[2];
const targetUserId = process.argv[3];
const action = process.argv[4]?.toLowerCase(); // kick | ban
const reason = process.argv[5] ?? null;

if (!serverId || !targetUserId || !action) {
  console.error("Usage: node scripts/admin-boot.mjs <SERVER_ID> <USER_ID> kick|ban [reason]");
  process.exit(1);
}
if (action !== "kick" && action !== "ban") {
  console.error("Action must be 'kick' or 'ban'");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: target } = await admin
  .from("server_members")
  .select("role")
  .eq("server_id", serverId)
  .eq("user_id", targetUserId)
  .single();

if (!target) {
  console.error("User is not a member of this server");
  process.exit(1);
}
if (target.role === "owner") {
  console.error("Cannot kick/ban the server owner");
  process.exit(1);
}

if (action === "ban") {
  await admin.from("server_bans").upsert(
    {
      server_id: serverId,
      user_id: targetUserId,
      banned_by_user_id: actorUserId,
      reason: reason ?? undefined,
    },
    { onConflict: "server_id,user_id" }
  );
}

await admin.from("member_removals").insert({
  server_id: serverId,
  user_id: targetUserId,
  removed_by_user_id: actorUserId,
  reason: reason ?? undefined,
});

await admin.from("server_members").delete().eq("server_id", serverId).eq("user_id", targetUserId);

await admin.from("audit_log").insert({
  server_id: serverId,
  actor_user_id: actorUserId,
  action: action === "ban" ? "member_ban" : "member_kick",
  target_type: "user",
  target_id: targetUserId,
  details: { reason: reason ?? undefined, script: true },
});

console.log(`${action === "ban" ? "Banned" : "Kicked"} ${targetUserId} from server ${serverId}.`);
if (reason) console.log("Reason:", reason);

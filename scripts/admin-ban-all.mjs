#!/usr/bin/env node
/**
 * Ban a user from all servers they belong to (except where they are owner). Uses service role.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... BOOT_ACTOR_USER_ID=... node scripts/admin-ban-all.mjs <USER_ID> [reason]
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
  console.error("Set BOOT_ACTOR_USER_ID for audit_log");
  process.exit(1);
}

const targetUserId = process.argv[2];
const reason = process.argv[3] ?? null;

if (!targetUserId) {
  console.error("Usage: node scripts/admin-ban-all.mjs <USER_ID> [reason]");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: memberships } = await admin
  .from("server_members")
  .select("server_id, role")
  .eq("user_id", targetUserId);

if (!memberships?.length) {
  console.log("User is not in any server.");
  process.exit(0);
}

const toRemove = memberships.filter((m) => m.role !== "owner");
let bannedFrom = 0;

for (const m of toRemove) {
  await admin.from("server_bans").upsert(
    {
      server_id: m.server_id,
      user_id: targetUserId,
      banned_by_user_id: actorUserId,
      reason: reason ?? undefined,
    },
    { onConflict: "server_id,user_id" }
  );
  await admin.from("server_members").delete().eq("server_id", m.server_id).eq("user_id", targetUserId);
  await admin.from("member_removals").insert({
    server_id: m.server_id,
    user_id: targetUserId,
    removed_by_user_id: actorUserId,
    reason: reason ?? undefined,
  });
  await admin.from("audit_log").insert({
    server_id: m.server_id,
    actor_user_id: actorUserId,
    action: "member_ban",
    target_type: "user",
    target_id: targetUserId,
    details: { reason: reason ?? undefined, script: true, ban_from_all: true },
  });
  bannedFrom++;
}

console.log(`Banned ${targetUserId} from ${bannedFrom} server(s).`);
if (reason) console.log("Reason:", reason);

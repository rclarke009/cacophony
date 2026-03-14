#!/usr/bin/env node
/**
 * Print invite tree for a server (who invited whom). Uses service role.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/admin-invite-tree.mjs <SERVER_ID>
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
  console.error("Usage: node scripts/admin-invite-tree.mjs <SERVER_ID>");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: members } = await admin
  .from("server_members")
  .select("user_id, role")
  .eq("server_id", serverId)
  .order("joined_at", { ascending: true });

const { data: invitations } = await admin
  .from("member_invitations")
  .select("user_id, invited_by_user_id")
  .eq("server_id", serverId);

const userIds = [...new Set((members ?? []).map((m) => m.user_id).concat((invitations ?? []).map((i) => i.invited_by_user_id)))];
const { data: profiles } = await admin.from("profiles").select("id, username").in("id", userIds);
const usernameById = new Map((profiles ?? []).map((p) => [p.id, p.username]));

const inviterByUser = new Map((invitations ?? []).map((i) => [i.user_id, i.invited_by_user_id]));
const membersList = members ?? [];
const childrenByInviter = new Map();
const rootIds = new Set();

for (const m of membersList) {
  const inv = inviterByUser.get(m.user_id);
  if (!inv) {
    rootIds.add(m.user_id);
    continue;
  }
  const inviterInServer = membersList.some((x) => x.user_id === inv);
  if (!inviterInServer) {
    rootIds.add(m.user_id);
    continue;
  }
  if (!childrenByInviter.has(inv)) childrenByInviter.set(inv, []);
  childrenByInviter.get(inv).push(m);
}

function printTree(userId, depth = 0) {
  const name = usernameById.get(userId) ?? userId.slice(0, 8);
  const m = membersList.find((x) => x.user_id === userId);
  const role = m?.role ?? "—";
  const indent = "  ".repeat(depth);
  console.log(`${indent}- ${name} (${role})`);
  const children = childrenByInviter.get(userId) ?? [];
  for (const c of children) {
    printTree(c.user_id, depth + 1);
  }
}

console.log(`Invite tree for server ${serverId}:`);
const roots = membersList.filter((m) => rootIds.has(m.user_id));
for (const r of roots) {
  printTree(r.user_id);
}

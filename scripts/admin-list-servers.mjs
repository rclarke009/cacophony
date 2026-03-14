#!/usr/bin/env node
/**
 * List all servers and their owners. Uses service role.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/admin-list-servers.mjs
 * Or: source .env.local && node scripts/admin-list-servers.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: servers, error: serversError } = await admin
  .from("servers")
  .select("id, name")
  .order("name");

if (serversError) {
  console.error(serversError);
  process.exit(1);
}

const { data: owners } = await admin
  .from("server_members")
  .select("server_id, user_id")
  .eq("role", "owner");

const ownerByServer = new Map((owners ?? []).map((o) => [o.server_id, o.user_id]));
const userIds = [...new Set(ownerByServer.values())];
const { data: profiles } = await admin.from("profiles").select("id, username").in("id", userIds);
const usernameById = new Map((profiles ?? []).map((p) => [p.id, p.username]));

console.log("Servers:");
for (const s of servers ?? []) {
  const ownerId = ownerByServer.get(s.id);
  const ownerName = ownerId ? usernameById.get(ownerId) ?? ownerId : null;
  console.log(`  ${s.id}  ${s.name}  (owner: ${ownerName ?? "—"})`);
}

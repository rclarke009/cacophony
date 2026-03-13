#!/usr/bin/env node
/**
 * Seed a channel with many messages (and some attachments) for heavy-use testing.
 * Run against a staging Supabase project. Requires service role key.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-heavy-use.mjs [COUNT]
 *
 * COUNT defaults to 5000. Use 50000 for a larger test. Optional SEED_USER_ID to use an existing user.
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seedUserId = process.env.SEED_USER_ID;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const count = Math.min(parseInt(process.argv[2] || "5000", 10) || 5000, 100000);

const supabase = createClient(url, key, { auth: { persistSession: false } });

// Tiny 1x1 PNG (67 bytes) – reuse one file for all attachment rows to keep storage minimal
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, "base64");

async function getOrCreateSeedUser() {
  if (seedUserId) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", seedUserId).single();
    if (profile) return seedUserId;
    console.error("SEED_USER_ID not found in profiles");
    process.exit(1);
  }
  const { data: users } = await supabase.from("profiles").select("id").limit(1);
  if (users?.length) return users[0].id;
  console.error("No users in project. Create a user first or set SEED_USER_ID.");
  process.exit(1);
}

async function getOrCreateServerAndChannel(userId) {
  const serverName = "Heavy Use Test Server";
  const channelName = "stress-test";

  let { data: server } = await supabase.from("servers").select("id").eq("name", serverName).maybeSingle();
  if (!server) {
    const { data: created, error } = await supabase.from("servers").insert({ name: serverName }).select("id").single();
    if (error) throw error;
    server = created;
    console.log("MYDEBUG →", "Created server", server.id);
  }

  const { data: member } = await supabase
    .from("server_members")
    .select("id")
    .eq("server_id", server.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) {
    await supabase.from("server_members").insert({ server_id: server.id, user_id: userId, role: "owner" });
    console.log("MYDEBUG →", "Added user as server owner");
  }

  let { data: channel } = await supabase
    .from("channels")
    .select("id")
    .eq("server_id", server.id)
    .eq("name", channelName)
    .maybeSingle();
  if (!channel) {
    const { data: created, error } = await supabase
      .from("channels")
      .insert({ server_id: server.id, name: channelName, created_by_user_id: userId })
      .select("id")
      .single();
    if (error) throw error;
    channel = created;
    console.log("MYDEBUG →", "Created channel", channel.id);
  }

  return { serverId: server.id, channelId: channel.id };
}

async function uploadOneTinyImage() {
  const hash = crypto.createHash("sha256").update(TINY_PNG_BUFFER).digest("hex");
  const path = `by-hash/${hash}.png`;
  const { error } = await supabase.storage.from("attachments").upload(path, TINY_PNG_BUFFER, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

async function main() {
  const userId = await getOrCreateSeedUser();
  const { channelId } = await getOrCreateServerAndChannel(userId);

  console.log("MYDEBUG →", "Seeding", count, "messages into channel", channelId);

  const BATCH = 1000;
  const start = Date.now();
  const threeMonthsAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

  const sampleContent = [
    "Hello world",
    "Testing heavy use",
    "Message #",
    "* waves",
    "Check out this link: https://example.com",
    "Lorem ipsum dolor sit amet.",
    "",
  ];

  let attachmentPath = null;
  const attachEvery = 5;

  for (let offset = 0; offset < count; offset += BATCH) {
    const batchSize = Math.min(BATCH, count - offset);
    const createdAts = Array.from({ length: batchSize }, (_, i) => {
      const t = threeMonthsAgo + (offset + i) / count * 90 * 24 * 60 * 60 * 1000;
      return new Date(t).toISOString();
    });

    const messages = createdAts.map((created_at, i) => ({
      channel_id: channelId,
      user_id: userId,
      content: sampleContent[(offset + i) % sampleContent.length] + (offset + i),
      created_at,
      updated_at: created_at,
    }));

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert(messages)
      .select("id, created_at");
    if (error) throw error;

    const withAttachments = inserted.filter((_, i) => (offset + i) % attachEvery === 0);
    if (withAttachments.length > 0) {
      if (!attachmentPath) attachmentPath = await uploadOneTinyImage();
      const attachments = withAttachments.map((m) => ({
        message_id: m.id,
        file_path: attachmentPath,
        file_type: "image",
      }));
      const { error: attachErr } = await supabase.from("attachments").insert(attachments);
      if (attachErr) throw attachErr;
    }

    console.log("MYDEBUG →", "Inserted", offset + batchSize, "/", count);
  }

  console.log("MYDEBUG →", "Done in", ((Date.now() - start) / 1000).toFixed(1), "s");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

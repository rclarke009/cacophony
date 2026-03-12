"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/lib/validation";
import { revalidatePath } from "next/cache";

const BOT_INVITER_THRESHOLD = 3;

export async function canModerate(
  serverId: string,
  userId: string
): Promise<boolean> {
  if (!isValidUUID(serverId) || !isValidUUID(userId)) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", userId)
    .single();
  return data?.role === "owner" || data?.role === "admin";
}

/** Resolve @username to user id in server (for slash commands). */
export async function getServerMemberIdByUsername(
  serverId: string,
  username: string
): Promise<{ userId: string } | { error: string }> {
  if (!isValidUUID(serverId)) return { error: "Invalid server" };
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("server_members")
    .select("user_id")
    .eq("server_id", serverId);
  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return { error: "No members found" };
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds)
    .ilike("username", username);
  const match = (profiles ?? []).find(
    (p) => p.username?.toLowerCase() === username.toLowerCase()
  );
  if (!match) return { error: `User @${username} not found in this server` };
  return { userId: match.id };
}

/** Get last N message ids in a channel (for /delete last N). */
export async function getLastMessageIdsInChannel(
  channelId: string,
  serverId: string,
  count: number
): Promise<{ messageIds: string[] } | { error: string }> {
  if (!isValidUUID(channelId) || !isValidUUID(serverId)) return { error: "Invalid channel or server" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!(await canModerate(serverId, user.id))) return { error: "Only moderators can bulk delete" };
  const n = Math.min(Math.max(1, count), 100);
  const { data: messages } = await supabase
    .from("messages")
    .select("id")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(n);
  const ids = (messages ?? []).map((m) => m.id);
  return { messageIds: ids };
}

async function writeAuditLog(
  serverId: string,
  actorUserId: string,
  action: string,
  targetType: "user" | "message" | "channel" | "thread" | "invite" | "role",
  targetId: string | null,
  details: Record<string, unknown> | null
) {
  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    server_id: serverId,
    actor_user_id: actorUserId,
    action,
    target_type: targetType,
    target_id: targetId ?? undefined,
    details: details ?? undefined,
  });
}

/** Check inviter bot count and create alert / revoke invite if >= 3 */
async function checkInviterBotAlert(
  admin: ReturnType<typeof createAdminClient>,
  serverId: string,
  removedUserId: string,
  reason: string | null
) {
  const isBot = reason?.toLowerCase().includes("bot") ?? false;
  if (!isBot) return;

  const { data: inv } = await admin
    .from("member_invitations")
    .select("invited_by_user_id")
    .eq("server_id", serverId)
    .eq("user_id", removedUserId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .single();

  if (!inv?.invited_by_user_id) return;

  const { data: counts } = await admin
    .from("member_removals")
    .select("user_id")
    .eq("server_id", serverId)
    .ilike("reason", "%bot%");

  const { data: invitations } = await admin
    .from("member_invitations")
    .select("user_id")
    .eq("server_id", serverId)
    .eq("invited_by_user_id", inv.invited_by_user_id);

  const removedUserIds = new Set(
    (counts ?? []).map((r) => r.user_id)
  );
  const invitedUserIds = new Set((invitations ?? []).map((i) => i.user_id));
  const botCount = [...invitedUserIds].filter((id) => removedUserIds.has(id))
    .length;

  if (botCount >= BOT_INVITER_THRESHOLD) {
    await admin.from("moderation_alerts").insert({
      server_id: serverId,
      user_id: inv.invited_by_user_id,
      alert_type: "inviter_bot_count",
      details: { bot_count: botCount, threshold: BOT_INVITER_THRESHOLD },
    });
    await admin
      .from("server_members")
      .update({ can_invite: false })
      .eq("server_id", serverId)
      .eq("user_id", inv.invited_by_user_id);
  }
}

export type TimeoutResult = { success: true } | { error: string };

export async function timeoutMember(
  serverId: string,
  targetUserId: string,
  durationMinutes: number
): Promise<TimeoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!isValidUUID(serverId) || !isValidUUID(targetUserId)) {
    return { error: "Invalid server or user" };
  }
  if (!(await canModerate(serverId, user.id))) {
    return { error: "You do not have permission to timeout members" };
  }
  if (durationMinutes < 1 || durationMinutes > 40320) {
    return { error: "Duration must be between 1 minute and 28 days" };
  }

  const until = new Date(Date.now() + durationMinutes * 60 * 1000);
  const { error } = await supabase
    .from("server_members")
    .update({ timeout_until: until.toISOString() })
    .eq("server_id", serverId)
    .eq("user_id", targetUserId);

  if (error) {
    console.log("MYDEBUG →", error);
    return { error: error.message };
  }
  await writeAuditLog(serverId, user.id, "member_timeout", "user", targetUserId, {
    duration_minutes: durationMinutes,
    timeout_until: until.toISOString(),
  });
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true };
}

export type KickResult = { success: true } | { error: string };

export async function kickMember(
  serverId: string,
  targetUserId: string,
  reason: string | null
): Promise<KickResult> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!isValidUUID(serverId) || !isValidUUID(targetUserId)) {
    return { error: "Invalid server or user" };
  }
  if (!(await canModerate(serverId, user.id))) {
    return { error: "You do not have permission to kick members" };
  }

  const { data: target } = await admin
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", targetUserId)
    .single();

  if (!target) return { error: "User is not a member of this server" };
  if (target.role === "owner") return { error: "Cannot kick the server owner" };
  if (target.role === "admin" && user.id !== targetUserId) {
    const { data: me } = await admin
      .from("server_members")
      .select("role")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .single();
    if (me?.role !== "owner") return { error: "Only the owner can kick admins" };
  }

  await admin.from("member_removals").insert({
    server_id: serverId,
    user_id: targetUserId,
    removed_by_user_id: user.id,
    reason: reason ?? undefined,
  });
  await admin
    .from("server_members")
    .delete()
    .eq("server_id", serverId)
    .eq("user_id", targetUserId);

  await checkInviterBotAlert(admin, serverId, targetUserId, reason);
  await writeAuditLog(serverId, user.id, "member_kick", "user", targetUserId, {
    reason: reason ?? undefined,
  });
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true };
}

export type BanResult = { success: true } | { error: string };

export async function banMember(
  serverId: string,
  targetUserId: string,
  reason: string | null
): Promise<BanResult> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!isValidUUID(serverId) || !isValidUUID(targetUserId)) {
    return { error: "Invalid server or user" };
  }
  if (!(await canModerate(serverId, user.id))) {
    return { error: "You do not have permission to ban members" };
  }

  const { data: target } = await admin
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", targetUserId)
    .single();

  if (target?.role === "owner") return { error: "Cannot ban the server owner" };
  if (target?.role === "admin" && user.id !== targetUserId) {
    const { data: me } = await admin
      .from("server_members")
      .select("role")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .single();
    if (me?.role !== "owner") return { error: "Only the owner can ban admins" };
  }

  await admin.from("server_bans").upsert(
    {
      server_id: serverId,
      user_id: targetUserId,
      banned_by_user_id: user.id,
      reason: reason ?? undefined,
    },
    { onConflict: "server_id,user_id" }
  );
  await admin
    .from("server_members")
    .delete()
    .eq("server_id", serverId)
    .eq("user_id", targetUserId);

  await admin.from("member_removals").insert({
    server_id: serverId,
    user_id: targetUserId,
    removed_by_user_id: user.id,
    reason: reason ?? undefined,
  });
  await checkInviterBotAlert(admin, serverId, targetUserId, reason);
  await writeAuditLog(serverId, user.id, "member_ban", "user", targetUserId, {
    reason: reason ?? undefined,
  });
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true };
}

export type UnbanResult = { success: true } | { error: string };

export async function unbanMember(
  serverId: string,
  targetUserId: string
): Promise<UnbanResult> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!(await canModerate(serverId, user.id))) {
    return { error: "You do not have permission to unban" };
  }
  const { error } = await admin
    .from("server_bans")
    .delete()
    .eq("server_id", serverId)
    .eq("user_id", targetUserId);
  if (error) return { error: error.message };
  await writeAuditLog(serverId, user.id, "member_unban", "user", targetUserId, null);
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true };
}

export type DeleteMessageResult = { success: true } | { error: string };

export async function deleteMessage(
  messageId: string,
  serverId: string
): Promise<DeleteMessageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!isValidUUID(messageId) || !isValidUUID(serverId)) {
    return { error: "Invalid message or server" };
  }

  const { data: msg } = await supabase
    .from("messages")
    .select("id, user_id, channel_id")
    .eq("id", messageId)
    .single();
  if (!msg) return { error: "Message not found" };

  const isOwner = msg.user_id === user.id;
  const canMod = await canModerate(serverId, user.id);
  if (!isOwner && !canMod) {
    return { error: "You can only delete your own messages" };
  }

  const { data: channel } = await supabase
    .from("channels")
    .select("server_id")
    .eq("id", msg.channel_id)
    .single();
  if (channel?.server_id !== serverId) return { error: "Message not in this server" };

  const { error } = await supabase.from("messages").delete().eq("id", messageId);
  if (error) {
    console.log("MYDEBUG →", error);
    return { error: error.message };
  }
  if (canMod && !isOwner) {
    await writeAuditLog(serverId, user.id, "message_delete", "message", messageId, {
      target_user_id: msg.user_id,
    });
  }
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true };
}

export async function deleteMessagesBulk(
  messageIds: string[],
  serverId: string
): Promise<{ success: true; deleted: number } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!(await canModerate(serverId, user.id))) {
    return { error: "Only moderators can bulk delete messages" };
  }
  if (messageIds.length === 0) return { success: true, deleted: 0 };
  if (messageIds.length > 100) return { error: "Maximum 100 messages per bulk delete" };

  const validIds = messageIds.filter((id) => isValidUUID(id));
  const { data: messages } = await supabase
    .from("messages")
    .select("id, channel_id")
    .in("id", validIds);

  const { data: channels } = await supabase
    .from("channels")
    .select("id, server_id")
    .in("id", [...new Set((messages ?? []).map((m) => m.channel_id))]);

  const serverChannelIds = new Set(
    (channels ?? [])
      .filter((c) => c.server_id === serverId)
      .map((c) => c.id)
  );
  const toDelete = (messages ?? []).filter((m) => serverChannelIds.has(m.channel_id)).map((m) => m.id);

  if (toDelete.length === 0) return { success: true, deleted: 0 };
  const { error } = await supabase.from("messages").delete().in("id", toDelete);
  if (error) return { error: error.message };
  await writeAuditLog(serverId, user.id, "messages_bulk_delete", "message", null, {
    message_ids: toDelete,
    count: toDelete.length,
  });
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true, deleted: toDelete.length };
}

export type WarnResult = { success: true } | { error: string };

export async function warnMember(
  serverId: string,
  targetUserId: string,
  reason: string | null
): Promise<WarnResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!(await canModerate(serverId, user.id))) {
    return { error: "You do not have permission to warn members" };
  }
  if (!isValidUUID(serverId) || !isValidUUID(targetUserId)) {
    return { error: "Invalid server or user" };
  }

  const { error } = await supabase.from("warnings").insert({
    server_id: serverId,
    user_id: targetUserId,
    warned_by_user_id: user.id,
    reason: reason ?? undefined,
  });
  if (error) {
    console.log("MYDEBUG →", error);
    return { error: error.message };
  }
  await writeAuditLog(serverId, user.id, "member_warn", "user", targetUserId, {
    reason: reason ?? undefined,
  });
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true };
}

export type SetVoiceMuteResult = { success: true } | { error: string };

/**
 * Sets voice mute state for a member. When the voice feature is implemented,
 * enforce in the voice channel layer: reject or mute audio if
 * server_members.voice_muted_until > now() for the user in that server.
 */
export async function setVoiceMute(
  serverId: string,
  targetUserId: string,
  mutedUntil: Date | null
): Promise<SetVoiceMuteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!(await canModerate(serverId, user.id))) {
    return { error: "You do not have permission to mute in voice" };
  }
  const { error } = await supabase
    .from("server_members")
    .update({
      voice_muted_until: mutedUntil?.toISOString() ?? null,
    })
    .eq("server_id", serverId)
    .eq("user_id", targetUserId);
  if (error) return { error: error.message };
  await writeAuditLog(serverId, user.id, "voice_mute", "user", targetUserId, {
    muted_until: mutedUntil?.toISOString() ?? null,
  });
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true };
}

export type ReportResult = { success: true } | { error: string };

export async function createReport(
  serverId: string,
  options: {
    reportedUserId?: string;
    reportedMessageId?: string;
    reason: string | null;
  }
): Promise<ReportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!isValidUUID(serverId)) return { error: "Invalid server" };
  if (!options.reportedUserId && !options.reportedMessageId) {
    return { error: "Report must target a user or a message" };
  }

  const { error } = await supabase.from("reports").insert({
    server_id: serverId,
    reporter_user_id: user.id,
    reported_user_id: options.reportedUserId ?? undefined,
    reported_message_id: options.reportedMessageId ?? undefined,
    reason: options.reason ?? undefined,
  });
  if (error) {
    console.log("MYDEBUG →", error);
    return { error: error.message };
  }
  revalidatePath("/chat");
  return { success: true };
}

export type ResolveReportResult = { success: true } | { error: string };

export async function resolveReport(
  reportId: string,
  serverId: string,
  status: "resolved" | "dismissed"
): Promise<ResolveReportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!(await canModerate(serverId, user.id))) {
    return { error: "Only moderators can resolve reports" };
  }
  const { error } = await supabase
    .from("reports")
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by_user_id: user.id,
    })
    .eq("id", reportId)
    .eq("server_id", serverId);
  if (error) return { error: error.message };
  revalidatePath("/chat");
  return { success: true };
}

export type RestoreInvitePermissionResult = { success: true } | { error: string };

export async function restoreInvitePermission(
  serverId: string,
  targetUserId: string
): Promise<RestoreInvitePermissionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!(await canModerate(serverId, user.id))) {
    return { error: "Only moderators can restore invite permission" };
  }
  const { error } = await supabase
    .from("server_members")
    .update({ can_invite: true })
    .eq("server_id", serverId)
    .eq("user_id", targetUserId);
  if (error) return { error: error.message };
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true };
}

export type ThreadActionResult = { success: true } | { error: string };

export async function lockThread(
  threadId: string,
  serverId: string
): Promise<ThreadActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!(await canModerate(serverId, user.id))) {
    return { error: "Only moderators can lock threads" };
  }
  const { data: thread } = await supabase
    .from("threads")
    .select("id, channel_id")
    .eq("id", threadId)
    .single();
  if (!thread) return { error: "Thread not found" };
  const { data: channel } = await supabase
    .from("channels")
    .select("server_id")
    .eq("id", thread.channel_id)
    .single();
  if (channel?.server_id !== serverId) return { error: "Thread not in this server" };
  const { error } = await supabase
    .from("threads")
    .update({ locked_at: new Date().toISOString() })
    .eq("id", threadId);
  if (error) return { error: error.message };
  await writeAuditLog(serverId, user.id, "thread_lock", "thread", threadId, null);
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true };
}

export async function unlockThread(
  threadId: string,
  serverId: string
): Promise<ThreadActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!(await canModerate(serverId, user.id))) {
    return { error: "Only moderators can unlock threads" };
  }
  const { data: thread } = await supabase
    .from("threads")
    .select("id, channel_id")
    .eq("id", threadId)
    .single();
  if (!thread) return { error: "Thread not found" };
  const { data: channel } = await supabase
    .from("channels")
    .select("server_id")
    .eq("id", thread.channel_id)
    .single();
  if (channel?.server_id !== serverId) return { error: "Thread not in this server" };
  const { error } = await supabase
    .from("threads")
    .update({ locked_at: null })
    .eq("id", threadId);
  if (error) return { error: error.message };
  await writeAuditLog(serverId, user.id, "thread_unlock", "thread", threadId, null);
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true };
}

export async function archiveThread(
  threadId: string,
  serverId: string
): Promise<ThreadActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!(await canModerate(serverId, user.id))) {
    return { error: "Only moderators can archive threads" };
  }
  const { data: thread } = await supabase
    .from("threads")
    .select("id, channel_id")
    .eq("id", threadId)
    .single();
  if (!thread) return { error: "Thread not found" };
  const { data: channel } = await supabase
    .from("channels")
    .select("server_id")
    .eq("id", thread.channel_id)
    .single();
  if (channel?.server_id !== serverId) return { error: "Thread not in this server" };
  const { error } = await supabase
    .from("threads")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", threadId);
  if (error) return { error: error.message };
  await writeAuditLog(serverId, user.id, "thread_archive", "thread", threadId, null);
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true };
}

export async function createThread(
  channelId: string,
  serverId: string,
  rootMessageId: string,
  title: string
): Promise<{ success: true; threadId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data: channel } = await supabase
    .from("channels")
    .select("server_id")
    .eq("id", channelId)
    .single();
  if (!channel || channel.server_id !== serverId) return { error: "Channel not found" };
  const { data: membership } = await supabase
    .from("server_members")
    .select("id")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();
  if (!membership) return { error: "Not a member" };
  const { data: thread, error } = await supabase
    .from("threads")
    .insert({
      channel_id: channelId,
      root_message_id: rootMessageId,
      title: title.slice(0, 100) || "Thread",
      created_by_user_id: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await writeAuditLog(serverId, user.id, "thread_create", "thread", thread.id, {
    root_message_id: rootMessageId,
  });
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true, threadId: thread.id };
}

export async function deleteThread(
  threadId: string,
  serverId: string
): Promise<ThreadActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!(await canModerate(serverId, user.id))) {
    return { error: "Only moderators can delete threads" };
  }
  const { data: thread } = await supabase
    .from("threads")
    .select("id, channel_id")
    .eq("id", threadId)
    .single();
  if (!thread) return { error: "Thread not found" };
  const { data: channel } = await supabase
    .from("channels")
    .select("server_id")
    .eq("id", thread.channel_id)
    .single();
  if (channel?.server_id !== serverId) return { error: "Thread not in this server" };
  const { error } = await supabase.from("threads").delete().eq("id", threadId);
  if (error) return { error: error.message };
  await writeAuditLog(serverId, user.id, "thread_delete", "thread", threadId, null);
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  return { success: true };
}

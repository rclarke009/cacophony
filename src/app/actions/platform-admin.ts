"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { isValidUUID } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import type { InviteTreeNode, MemberRow } from "./members";

const BOT_INVITER_THRESHOLD = 3;

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

  const removedUserIds = new Set((counts ?? []).map((r) => r.user_id));
  const invitedUserIds = new Set((invitations ?? []).map((i) => i.user_id));
  const botCount = [...invitedUserIds].filter((id) => removedUserIds.has(id)).length;

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

async function requirePlatformAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { error: "Not authenticated" };
  if (!isPlatformAdmin(user.id)) return { error: "Platform admin only" };
  return { userId: user.id };
}

export type ServerForAdmin = {
  id: string;
  name: string;
  owner_user_id: string | null;
  owner_username: string | null;
};

export async function getServersForAdmin(): Promise<{
  servers: ServerForAdmin[];
  error?: string;
}> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return { servers: [], error: auth.error };

  const admin = createAdminClient();
  const { data: servers, error: serversError } = await admin
    .from("servers")
    .select("id, name")
    .order("name");

  if (serversError) return { servers: [], error: serversError.message };
  if (!servers?.length) return { servers: [] };

  const ownerRows = await admin
    .from("server_members")
    .select("server_id, user_id")
    .eq("role", "owner");
  const ownerByServer = new Map(
    (ownerRows.data ?? []).map((r) => [r.server_id, r.user_id])
  );
  const ownerIds = [...new Set(ownerByServer.values())];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username")
    .in("id", ownerIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));

  const list: ServerForAdmin[] = servers.map((s) => {
    const uid = ownerByServer.get(s.id) ?? null;
    return {
      id: s.id,
      name: s.name,
      owner_user_id: uid ?? null,
      owner_username: (uid && profileMap.get(uid)) ?? null,
    };
  });
  return { servers: list };
}

/** Fetch members + invite info for a server using admin client (any server). */
export async function getServerMembersWithInviteInfoAdmin(
  serverId: string
): Promise<{ members: MemberRow[]; error?: string }> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return { members: [], error: auth.error };
  if (!isValidUUID(serverId)) return { members: [], error: "Invalid server" };

  const admin = createAdminClient();
  const { data: members, error: membersError } = await admin
    .from("server_members")
    .select("user_id, role, joined_at, timeout_until, can_invite")
    .eq("server_id", serverId)
    .order("joined_at", { ascending: true });

  if (membersError) return { members: [], error: membersError.message };
  if (!members?.length) return { members: [] };

  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username")
    .in("id", userIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));

  const { data: invitations } = await admin
    .from("member_invitations")
    .select("user_id, invited_by_user_id")
    .eq("server_id", serverId);
  const inviterMap = new Map(
    (invitations ?? []).map((i) => [i.user_id, i.invited_by_user_id])
  );
  const inviterIds = [...new Set((invitations ?? []).map((i) => i.invited_by_user_id))];
  const { data: inviterProfiles } = await admin
    .from("profiles")
    .select("id, username")
    .in("id", inviterIds);
  const inviterProfileMap = new Map(
    (inviterProfiles ?? []).map((p) => [p.id, p.username])
  );

  const { data: removals } = await admin
    .from("member_removals")
    .select("user_id")
    .eq("server_id", serverId)
    .ilike("reason", "%bot%");
  const removedAsBot = new Set((removals ?? []).map((r) => r.user_id));
  const invitedByToBotCount = new Map<string, number>();
  for (const inv of invitations ?? []) {
    if (removedAsBot.has(inv.user_id)) {
      const id = inv.invited_by_user_id;
      invitedByToBotCount.set(id, (invitedByToBotCount.get(id) ?? 0) + 1);
    }
  }

  const membersList: MemberRow[] = members.map((m) => {
    const invitedBy = inviterMap.get(m.user_id) ?? null;
    const inviterUsername = invitedBy ? inviterProfileMap.get(invitedBy) ?? null : null;
    const botCount = invitedByToBotCount.get(m.user_id) ?? 0;
    return {
      user_id: m.user_id,
      username: profileMap.get(m.user_id) ?? null,
      role: m.role,
      joined_at: m.joined_at,
      timeout_until: m.timeout_until ?? null,
      can_invite: m.can_invite ?? true,
      invited_by_user_id: invitedBy,
      inviter_username: inviterUsername,
      bot_invitee_count: botCount,
    };
  });
  return { members: membersList };
}

function buildTreeNode(
  m: MemberRow,
  childrenByInviter: Map<string, MemberRow[]>
): InviteTreeNode {
  const children = (childrenByInviter.get(m.user_id) ?? []).map((child) =>
    buildTreeNode(child, childrenByInviter)
  );
  return {
    user_id: m.user_id,
    username: m.username,
    role: m.role,
    invited_by_user_id: m.invited_by_user_id,
    children,
    bot_invitee_count: m.bot_invitee_count,
  };
}

export async function getInviteTreeForAdmin(
  serverId: string
): Promise<{ tree: InviteTreeNode[]; error?: string }> {
  const { members, error } = await getServerMembersWithInviteInfoAdmin(serverId);
  if (error) return { tree: [], error };

  const childrenByInviter = new Map<string, MemberRow[]>();
  const rootIds = new Set<string>();

  for (const m of members) {
    const inv = m.invited_by_user_id;
    if (!inv) {
      rootIds.add(m.user_id);
      continue;
    }
    const inviterInServer = members.some((x) => x.user_id === inv);
    if (!inviterInServer) {
      rootIds.add(m.user_id);
      continue;
    }
    if (!childrenByInviter.has(inv)) childrenByInviter.set(inv, []);
    childrenByInviter.get(inv)!.push(m);
  }

  const roots = members.filter((m) => rootIds.has(m.user_id));
  const tree: InviteTreeNode[] = roots.map((r) => buildTreeNode(r, childrenByInviter));
  return { tree };
}

export type UserSearchResult = {
  user_id: string;
  username: string | null;
  email: string | null;
  servers: { server_id: string; server_name: string; role: string; invited_by_username: string | null }[];
};

export async function searchUserForAdmin(
  query: string
): Promise<{ users: UserSearchResult[]; error?: string }> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return { users: [], error: auth.error };

  const trimmed = query.trim();
  if (trimmed.length < 2) return { users: [] };

  const admin = createAdminClient();
  const isEmail = trimmed.includes("@");

  let userIds: string[] = [];

  let emailMap = new Map<string, string>();
  if (isEmail) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const matches = (list.users ?? []).filter(
      (u) => u.email?.toLowerCase().includes(trimmed.toLowerCase())
    );
    userIds = matches.map((u) => u.id);
    for (const u of matches) {
      if (u.email) emailMap.set(u.id, u.email);
    }
  } else {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id")
      .ilike("username", `%${trimmed}%`)
      .limit(50);
    userIds = (profiles ?? []).map((p) => p.id);
  }

  if (userIds.length === 0) return { users: [] };

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username")
    .in("id", userIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));

  const { data: memberships } = await admin
    .from("server_members")
    .select("server_id, user_id, role")
    .in("user_id", userIds);
  const serverIds = [...new Set((memberships ?? []).map((m) => m.server_id))];
  const { data: servers } = await admin
    .from("servers")
    .select("id, name")
    .in("id", serverIds);
  const serverMap = new Map((servers ?? []).map((s) => [s.id, s.name]));

  const { data: invitations } = await admin
    .from("member_invitations")
    .select("server_id, user_id, invited_by_user_id")
    .in("user_id", userIds);
  const inviterIds = [...new Set((invitations ?? []).map((i) => i.invited_by_user_id))];
  const { data: inviterProfiles } = await admin
    .from("profiles")
    .select("id, username")
    .in("id", inviterIds);
  const inviterByKey = new Map<string, string | null>();
  for (const i of invitations ?? []) {
    const inv = inviterProfiles?.find((p) => p.id === i.invited_by_user_id);
    inviterByKey.set(`${i.server_id}:${i.user_id}`, inv?.username ?? null);
  }

  const users: UserSearchResult[] = userIds.slice(0, 25).map((uid) => {
    const userMemberships = (memberships ?? []).filter((m) => m.user_id === uid);
    const serversList = userMemberships.map((m) => ({
      server_id: m.server_id,
      server_name: serverMap.get(m.server_id) ?? "Unknown",
      role: m.role,
      invited_by_username: inviterByKey.get(`${m.server_id}:${uid}`) ?? null,
    }));
    return {
      user_id: uid,
      username: profileMap.get(uid) ?? null,
      email: emailMap.get(uid) ?? null,
      servers: serversList,
    };
  });

  return { users };
}

export type PlatformAdminKickResult = { success: true } | { error: string };
export async function platformAdminKick(
  serverId: string,
  targetUserId: string,
  reason: string | null
): Promise<PlatformAdminKickResult> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return { error: auth.error };
  if (!isValidUUID(serverId) || !isValidUUID(targetUserId)) {
    return { error: "Invalid server or user" };
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", targetUserId)
    .single();

  if (!target) return { error: "User is not a member of this server" };
  if (target.role === "owner") return { error: "Cannot kick the server owner" };

  await admin.from("member_removals").insert({
    server_id: serverId,
    user_id: targetUserId,
    removed_by_user_id: auth.userId,
    reason: reason ?? undefined,
  });
  await admin
    .from("server_members")
    .delete()
    .eq("server_id", serverId)
    .eq("user_id", targetUserId);

  await checkInviterBotAlert(admin, serverId, targetUserId, reason);
  await writeAuditLog(serverId, auth.userId, "member_kick", "user", targetUserId, {
    reason: reason ?? undefined,
    platform_admin: true,
  });
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  revalidatePath("/platform-admin");
  return { success: true };
}

export type PlatformAdminBanResult = { success: true } | { error: string };
export async function platformAdminBan(
  serverId: string,
  targetUserId: string,
  reason: string | null
): Promise<PlatformAdminBanResult> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return { error: auth.error };
  if (!isValidUUID(serverId) || !isValidUUID(targetUserId)) {
    return { error: "Invalid server or user" };
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", targetUserId)
    .single();

  if (target?.role === "owner") return { error: "Cannot ban the server owner" };

  await admin.from("server_bans").upsert(
    {
      server_id: serverId,
      user_id: targetUserId,
      banned_by_user_id: auth.userId,
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
    removed_by_user_id: auth.userId,
    reason: reason ?? undefined,
  });
  await checkInviterBotAlert(admin, serverId, targetUserId, reason);
  await writeAuditLog(serverId, auth.userId, "member_ban", "user", targetUserId, {
    reason: reason ?? undefined,
    platform_admin: true,
  });
  revalidatePath("/chat");
  revalidatePath(`/chat/${serverId}`);
  revalidatePath("/platform-admin");
  return { success: true };
}

export type BanFromAllServersResult = { success: true; banned_from: number } | { error: string };
export async function banFromAllServers(
  targetUserId: string,
  reason: string | null
): Promise<BanFromAllServersResult> {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return { error: auth.error };
  if (!isValidUUID(targetUserId)) return { error: "Invalid user" };

  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("server_members")
    .select("server_id, role")
    .eq("user_id", targetUserId);

  if (!memberships?.length) return { success: true, banned_from: 0 };

  const notOwner = memberships.filter((m) => m.role !== "owner");
  let bannedFrom = 0;

  for (const m of notOwner) {
    const { data: target } = await admin
      .from("server_members")
      .select("user_id")
      .eq("server_id", m.server_id)
      .eq("user_id", targetUserId)
      .single();
    if (!target) continue;

    await admin.from("server_bans").upsert(
      {
        server_id: m.server_id,
        user_id: targetUserId,
        banned_by_user_id: auth.userId,
        reason: reason ?? undefined,
      },
      { onConflict: "server_id,user_id" }
    );
    await admin
      .from("server_members")
      .delete()
      .eq("server_id", m.server_id)
      .eq("user_id", targetUserId);
    await admin.from("member_removals").insert({
      server_id: m.server_id,
      user_id: targetUserId,
      removed_by_user_id: auth.userId,
      reason: reason ?? undefined,
    });
    await checkInviterBotAlert(admin, m.server_id, targetUserId, reason);
    await writeAuditLog(m.server_id, auth.userId, "member_ban", "user", targetUserId, {
      reason: reason ?? undefined,
      platform_admin: true,
      ban_from_all: true,
    });
    bannedFrom++;
  }

  revalidatePath("/chat");
  revalidatePath("/platform-admin");
  return { success: true, banned_from: bannedFrom };
}

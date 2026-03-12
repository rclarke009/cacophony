"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validation";

export type MemberRow = {
  user_id: string;
  username: string | null;
  role: string;
  joined_at: string;
  timeout_until: string | null;
  can_invite: boolean | null;
  invited_by_user_id: string | null;
  inviter_username: string | null;
  bot_invitee_count: number;
};

export async function getServerMembersWithInviteInfo(
  serverId: string
): Promise<{ members: MemberRow[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { members: [], error: "Not authenticated" };
  if (!isValidUUID(serverId)) return { members: [], error: "Invalid server" };

  const { data: members, error: membersError } = await supabase
    .from("server_members")
    .select("user_id, role, joined_at, timeout_until, can_invite")
    .eq("server_id", serverId)
    .order("joined_at", { ascending: true });

  if (membersError) {
    console.log("MYDEBUG →", membersError);
    return { members: [], error: membersError.message };
  }
  if (!members?.length) return { members: [] };

  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.username])
  );

  const { data: invitations } = await supabase
    .from("member_invitations")
    .select("user_id, invited_by_user_id")
    .eq("server_id", serverId);

  const inviterMap = new Map(
    (invitations ?? []).map((i) => [i.user_id, i.invited_by_user_id])
  );
  const inviterIds = [...new Set((invitations ?? []).map((i) => i.invited_by_user_id))];
  const { data: inviterProfiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", inviterIds);
  const inviterProfileMap = new Map(
    (inviterProfiles ?? []).map((p) => [p.id, p.username])
  );

  const { data: removals } = await supabase
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

export type InviteTreeNode = {
  user_id: string;
  username: string | null;
  role: string;
  invited_by_user_id: string | null;
  children: InviteTreeNode[];
  bot_invitee_count: number;
};

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

export async function getInviteTree(
  serverId: string
): Promise<{ tree: InviteTreeNode[]; error?: string }> {
  const { members, error } = await getServerMembersWithInviteInfo(serverId);
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

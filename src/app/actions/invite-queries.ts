"use server";

import { createClient } from "@/lib/supabase/server";

export type InviteableUser = {
  id: string;
  username: string | null;
};

export async function getKnownUsersForInvite(
  serverId: string
): Promise<InviteableUser[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: myServers } = await supabase
    .from("server_members")
    .select("server_id")
    .eq("user_id", user.id)
    .neq("server_id", serverId);

  const otherServerIds = myServers?.map((m) => m.server_id) ?? [];
  if (otherServerIds.length === 0) return [];

  const { data: members } = await supabase
    .from("server_members")
    .select("user_id")
    .in("server_id", otherServerIds)
    .neq("user_id", user.id);

  const userIdsFromOtherServers = [
    ...new Set(members?.map((m) => m.user_id) ?? []),
  ];

  const { data: currentMembers } = await supabase
    .from("server_members")
    .select("user_id")
    .eq("server_id", serverId);

  const currentMemberIds = new Set(
    currentMembers?.map((m) => m.user_id) ?? []
  );
  const inviteableIds = userIdsFromOtherServers.filter(
    (id) => !currentMemberIds.has(id)
  );
  if (inviteableIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", inviteableIds);

  return (profiles ?? []) as InviteableUser[];
}

export async function searchUsersByUsername(
  query: string,
  serverId: string
): Promise<InviteableUser[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .ilike("username", `%${trimmed}%`)
    .neq("id", user.id)
    .limit(20);

  if (!profiles?.length) return [];

  const { data: currentMembers } = await supabase
    .from("server_members")
    .select("user_id")
    .eq("server_id", serverId);

  const currentMemberIds = new Set(
    currentMembers?.map((m) => m.user_id) ?? []
  );
  const inviteable = profiles.filter((p) => !currentMemberIds.has(p.id));

  return inviteable as InviteableUser[];
}

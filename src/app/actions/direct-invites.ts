"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/lib/validation";

export type PendingInvite = {
  id: string;
  server_id: string;
  server_name: string;
  invited_by_username: string | null;
};

export async function sendDirectInvite(
  serverId: string,
  invitedUserId: string
): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to send an invite" };
  }

  if (user.id === invitedUserId) {
    return { error: "You cannot invite yourself" };
  }
  if (!isValidUUID(serverId) || !isValidUUID(invitedUserId)) {
    return { error: "Invalid server or user" };
  }

  const { data: membership } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();

  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  if (!isAdmin) {
    return { error: "Only server owners and admins can invite people" };
  }

  const { data: existingMember } = await supabase
    .from("server_members")
    .select("id")
    .eq("server_id", serverId)
    .eq("user_id", invitedUserId)
    .single();

  if (existingMember) {
    return { error: "That user is already in this server" };
  }

  const { data: existingInvite } = await supabase
    .from("direct_invites")
    .select("id")
    .eq("server_id", serverId)
    .eq("invited_user_id", invitedUserId)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    return { error: "That user has already been invited" };
  }

  const { error } = await supabase.from("direct_invites").insert({
    server_id: serverId,
    invited_user_id: invitedUserId,
    invited_by_user_id: user.id,
    status: "pending",
  });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("MYDEBUG →", { error });
    }
    return { error: error.message };
  }

  revalidatePath("/chat");
  return { success: true };
}

export async function acceptDirectInvite(inviteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to accept an invite" };
  }
  if (!isValidUUID(inviteId)) {
    return { error: "Invalid invite" };
  }

  const { data: invite, error: inviteError } = await supabase
    .from("direct_invites")
    .select("id, server_id, status")
    .eq("id", inviteId)
    .eq("invited_user_id", user.id)
    .single();

  if (inviteError || !invite || invite.status !== "pending") {
    return { error: "Invalid or expired invite" };
  }

  const admin = createAdminClient();

  const { error: insertError } = await admin.from("server_members").insert({
    server_id: invite.server_id,
    user_id: user.id,
    role: "member",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      await admin
        .from("direct_invites")
        .update({ status: "accepted" })
        .eq("id", inviteId);
      revalidatePath("/chat");
      redirect(`/chat/${invite.server_id}`);
    }
    if (process.env.NODE_ENV === "development") {
      console.log("MYDEBUG →", { insertError });
    }
    return { error: insertError.message };
  }

  await admin
    .from("direct_invites")
    .update({ status: "accepted" })
    .eq("id", inviteId);

  const { data: channels } = await admin
    .from("channels")
    .select("id")
    .eq("server_id", invite.server_id)
    .order("created_at", { ascending: true })
    .limit(1);

  revalidatePath("/chat");
  const firstChannelId = channels?.[0]?.id;
  if (firstChannelId) {
    redirect(`/chat/${invite.server_id}/${firstChannelId}`);
  }
  redirect(`/chat/${invite.server_id}`);
}

export async function declineDirectInvite(
  inviteId: string
): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to decline an invite" };
  }
  if (!isValidUUID(inviteId)) {
    return { error: "Invalid invite" };
  }

  const { data: invite, error: inviteError } = await supabase
    .from("direct_invites")
    .select("id, status")
    .eq("id", inviteId)
    .eq("invited_user_id", user.id)
    .single();

  if (inviteError || !invite || invite.status !== "pending") {
    return { error: "Invalid or expired invite" };
  }

  const { error } = await supabase
    .from("direct_invites")
    .update({ status: "declined" })
    .eq("id", inviteId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/chat");
  return { success: true };
}

export async function getPendingInvitesForUser(): Promise<PendingInvite[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: invites, error } = await supabase
    .from("direct_invites")
    .select("id, server_id, invited_by_user_id, servers(name)")
    .eq("invited_user_id", user.id)
    .eq("status", "pending");

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("MYDEBUG →", { error });
    }
    return [];
  }

  const inviterIds = [
    ...new Set((invites ?? []).map((i) => i.invited_by_user_id)),
  ];
  const { data: profiles } =
    inviterIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username")
          .in("id", inviterIds)
      : { data: [] };
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.username])
  );

  return (invites ?? []).map((inv) => {
    const server = inv.servers as unknown as { name: string } | null;
    return {
      id: inv.id,
      server_id: inv.server_id,
      server_name: server?.name ?? "Unknown server",
      invited_by_username: profileMap.get(inv.invited_by_user_id) ?? null,
    };
  });
}

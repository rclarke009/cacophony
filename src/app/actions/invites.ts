"use server";

import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

const DEFAULT_MAX_USES = 10;

export async function createInvite(serverId: string, maxUses = DEFAULT_MAX_USES) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create an invite" };
  }

  const { data: membership } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();

  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  if (!isAdmin) {
    return { error: "Only server owners and admins can create invites" };
  }

  const code = nanoid(8);

  const { data: invite, error } = await supabase
    .from("invites")
    .insert({
      code,
      server_id: serverId,
      created_by_user_id: user.id,
      max_uses: maxUses,
    })
    .select("code")
    .single();

  if (error) {
    if (error.code === "23505") {
      return createInvite(serverId, maxUses);
    }
    if (process.env.NODE_ENV === "development") {
      console.log("MYDEBUG →", { error });
    }
    return { error: error.message };
  }

  return { code: invite.code, maxUses };
}

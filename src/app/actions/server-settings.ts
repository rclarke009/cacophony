"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validation";

export type ServerModerationSettings = {
  verification_level: string;
  explicit_media_filter: string;
};

export async function getServerModerationSettings(
  serverId: string
): Promise<{ settings: ServerModerationSettings | null; error?: string }> {
  const supabase = await createClient();
  if (!isValidUUID(serverId)) return { settings: null, error: "Invalid server" };
  const { data, error } = await supabase
    .from("server_moderation_settings")
    .select("verification_level, explicit_media_filter")
    .eq("server_id", serverId)
    .single();
  if (error && error.code !== "PGRST116") {
    console.log("MYDEBUG →", error);
    return { settings: null, error: error.message };
  }
  return {
    settings: data
      ? {
          verification_level: data.verification_level ?? "none",
          explicit_media_filter: data.explicit_media_filter ?? "off",
        }
      : null,
  };
}

export async function upsertServerModerationSettings(
  serverId: string,
  settings: ServerModerationSettings
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data: membership } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    return { error: "Only server owners and admins can change these settings" };
  }
  const { error } = await supabase.from("server_moderation_settings").upsert(
    {
      server_id: serverId,
      verification_level: settings.verification_level,
      explicit_media_filter: settings.explicit_media_filter,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "server_id" }
  );
  if (error) return { error: error.message };
  return { success: true };
}

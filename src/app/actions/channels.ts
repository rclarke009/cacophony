"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const MAX_CHANNEL_NAME_LENGTH = 100;

export async function createChannel(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const serverId = formData.get("serverId") as string;
  const name = (formData.get("name") as string)?.trim();
  const type = (formData.get("type") as string) || "text";

  if (!serverId) {
    return { error: "Server ID is required" };
  }
  if (!isValidUUID(serverId)) {
    return { error: "Invalid server" };
  }

  if (!name) {
    return { error: "Channel name is required" };
  }
  if (name.length > MAX_CHANNEL_NAME_LENGTH) {
    return { error: `Channel name must be ${MAX_CHANNEL_NAME_LENGTH} characters or less` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a channel" };
  }

  const { data: channel, error } = await supabase
    .from("channels")
    .insert({
      server_id: serverId,
      name,
      type: type === "voice" ? "voice" : "text",
      created_by_user_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("MYDEBUG →", { error });
    }
    return { error: error.message };
  }

  revalidatePath(`/chat/${serverId}`);
  redirect(`/chat/${serverId}/${channel.id}`);
}

export async function updateChannelSlowmode(
  serverId: string,
  channelId: string,
  slowmodeSeconds: number
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
    return { error: "Only server owners and admins can change channel settings" };
  }
  const sec = Math.max(0, Math.min(21600, slowmodeSeconds));
  const { error } = await supabase
    .from("channels")
    .update({ slowmode_seconds: sec })
    .eq("id", channelId)
    .eq("server_id", serverId);
  if (error) return { error: error.message };
  revalidatePath(`/chat/${serverId}`);
  return { success: true };
}

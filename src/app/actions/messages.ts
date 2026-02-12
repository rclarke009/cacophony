"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendMessage(formData: FormData) {
  const channelId = formData.get("channel_id") as string;
  const content = formData.get("content") as string;

  if (!channelId) {
    return { error: "Channel is required" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Message cannot be empty" };
  }

  const { error } = await supabase.from("messages").insert({
    channel_id: channelId,
    user_id: user.id,
    content: trimmed,
  });

  if (error) {
    console.log("MYDEBUG →", error);
    return { error: error.message };
  }

  revalidatePath(`/chat`);
  return { success: true };
}

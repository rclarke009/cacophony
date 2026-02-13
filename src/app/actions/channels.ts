"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  if (!name) {
    return { error: "Channel name is required" };
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
    })
    .select("id")
    .single();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.log("MYDEBUG →", { error });
    }
    return { error: error.message };
  }

  redirect(`/chat/${serverId}/${channel.id}`);
}

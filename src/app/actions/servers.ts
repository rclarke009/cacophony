"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createServer(prevState: { error?: string } | null, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const iconEmoji = (formData.get("icon_emoji") as string)?.trim() || null;

  if (!name) {
    return { error: "Server name is required" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a server" };
  }

  const admin = createAdminClient();

  const { data: server, error: serverError } = await admin
    .from("servers")
    .insert({ name, icon_emoji: iconEmoji })
    .select("id")
    .single();

  if (serverError || !server) {
    if (process.env.NODE_ENV === "development") {
      console.log("MYDEBUG →", { serverError });
    }
    return { error: serverError?.message ?? "Failed to create server" };
  }

  const { error: memberError } = await admin.from("server_members").insert({
    server_id: server.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    if (process.env.NODE_ENV === "development") {
      console.log("MYDEBUG →", { memberError });
    }
    return { error: memberError.message ?? "Failed to add you as server owner" };
  }

  const { data: channel, error: channelError } = await admin
    .from("channels")
    .insert({ server_id: server.id, name: "general", type: "text" })
    .select("id")
    .single();

  if (channelError || !channel) {
    if (process.env.NODE_ENV === "development") {
      console.log("MYDEBUG →", { channelError });
    }
    return { error: channelError?.message ?? "Failed to create default channel" };
  }

  revalidatePath("/chat");
  redirect(`/chat/${server.id}/${channel.id}`);
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidHexColor, isSingleEmoji } from "@/lib/validation";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const MAX_SERVER_NAME_LENGTH = 100;
const ALLOWED_ICON_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_ICON_SIZE = 2 * 1024 * 1024; // 2 MB

function getIconExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return map[mimeType] ?? "jpg";
}

export async function createServer(prevState: { error?: string } | null, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const iconEmoji = (formData.get("icon_emoji") as string)?.trim() || null;
  const iconColor = (formData.get("icon_color") as string)?.trim() || null;
  const iconFile = formData.get("icon_file") as File | null;

  if (!name) {
    return { error: "Server name is required" };
  }
  if (name.length > MAX_SERVER_NAME_LENGTH) {
    return { error: `Server name must be ${MAX_SERVER_NAME_LENGTH} characters or less` };
  }

  // Validate icon_emoji and icon_color (when not using image)
  const hasImage = iconFile && iconFile instanceof File && iconFile.size > 0;
  if (!hasImage) {
    if (iconEmoji && !isSingleEmoji(iconEmoji)) {
      return { error: "Invalid icon emoji" };
    }
    if (iconColor && !isValidHexColor(iconColor)) {
      return { error: "Invalid icon color. Use a hex color (e.g. #3b82f6)" };
    }
  }

  // Validate icon file if present
  if (iconFile && iconFile instanceof File && iconFile.size > 0) {
    if (!ALLOWED_ICON_MIME_TYPES.includes(iconFile.type)) {
      return { error: "Invalid image type. Use JPEG, PNG, GIF, or WebP." };
    }
    if (iconFile.size > MAX_ICON_SIZE) {
      return { error: "Server icon must be under 2 MB." };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a server" };
  }

  const admin = createAdminClient();

  // Determine icon: image takes precedence, then color, then emoji
  const serverInsert: { name: string; icon_emoji?: string | null; icon_color?: string | null; icon_url?: string | null } = {
    name,
    icon_emoji: hasImage ? null : iconEmoji || null,
    icon_color: hasImage ? null : iconColor || null,
    icon_url: null,
  };

  const { data: server, error: serverError } = await admin
    .from("servers")
    .insert(serverInsert)
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

  // Upload custom icon image if provided
  if (hasImage && iconFile instanceof File) {
    const ext = getIconExt(iconFile.type);
    const path = `${server.id}/icon.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("server-icons")
      .upload(path, iconFile, { contentType: iconFile.type, upsert: true });

    if (uploadError) {
      if (process.env.NODE_ENV === "development") {
        console.log("MYDEBUG →", uploadError);
      }
      return { error: uploadError.message ?? "Failed to upload server icon" };
    }

    const { data: urlData } = admin.storage
      .from("server-icons")
      .getPublicUrl(path);

    await admin
      .from("servers")
      .update({ icon_url: urlData.publicUrl })
      .eq("id", server.id);
  }

  revalidatePath("/chat");
  redirect(`/chat/${server.id}/${channel.id}`);
}

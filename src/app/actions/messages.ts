"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGES_PER_MESSAGE = 5;

function sanitizeFilename(name: string): string {
  const ext = name.split(".").pop() || "jpg";
  return `${randomUUID()}.${ext}`;
}

export async function sendMessage(formData: FormData) {
  const channelId = formData.get("channel_id") as string;
  const content = (formData.get("content") as string)?.trim() ?? "";
  const files = formData.getAll("files") as File[];

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

  const hasContent = content.length > 0;
  const hasFiles = files.length > 0 && files.every((f) => f instanceof File);

  if (!hasContent && !hasFiles) {
    return { error: "Message cannot be empty" };
  }

  // Validate files if present
  if (hasFiles) {
    if (files.length > MAX_IMAGES_PER_MESSAGE) {
      return {
        error: `Maximum ${MAX_IMAGES_PER_MESSAGE} images per message`,
      };
    }
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
          error: `Invalid file type. Allowed: JPEG, PNG, GIF, WebP`,
        };
      }
      if (file.size > MAX_FILE_SIZE) {
        return { error: "Each image must be under 5 MB" };
      }
    }
  }

  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      channel_id: channelId,
      user_id: user.id,
      content: content || "",
    })
    .select("id")
    .single();

  if (insertError) {
    console.log("MYDEBUG →", insertError);
    return { error: insertError.message };
  }

  const messageId = message.id;

  if (hasFiles) {
    for (const file of files) {
      const filename = sanitizeFilename(file.name);
      const path = `${channelId}/${messageId}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        console.log("MYDEBUG →", uploadError);
        return { error: uploadError.message };
      }

      const { error: attachError } = await supabase.from("attachments").insert({
        message_id: messageId,
        file_path: path,
        file_type: "image",
      });

      if (attachError) {
        console.log("MYDEBUG →", attachError);
        return { error: attachError.message };
      }
    }
  }

  revalidatePath(`/chat`);
  return { success: true };
}

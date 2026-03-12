"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validation";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_IMAGES_PER_MESSAGE,
  MAX_MESSAGE_CONTENT_LENGTH,
  MAX_TOTAL_ATTACHMENTS,
} from "@/lib/constants";
import { revalidatePath } from "next/cache";

export type PrepareMessageInput = {
  channelId: string;
  content: string;
  threadId?: string;
  files?: Array<{ name: string; size: number; type: string }>;
};

export type PrepareMessageResult =
  | { success: true }
  | { messageId: string }
  | { error: string };

/**
 * Prepares a message. For messages with files: creates message only.
 * Client uploads files via /api/chat/upload-attachment (server uses service role).
 */
export async function prepareMessageWithUploads(
  input: PrepareMessageInput
): Promise<PrepareMessageResult> {
  try {
    const { channelId, content, threadId, files = [] } = input;
    const trimmedContent = content?.trim() ?? "";

    if (!channelId) {
      return { error: "Channel is required" };
    }
    if (!isValidUUID(channelId)) {
      return { error: "Invalid channel" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    const hasContent = trimmedContent.length > 0;
    const hasFiles = files.length > 0;

    if (!hasContent && !hasFiles) {
      return { error: "Message cannot be empty" };
    }
    if (trimmedContent.length > MAX_MESSAGE_CONTENT_LENGTH) {
      return {
        error: `Message must be ${MAX_MESSAGE_CONTENT_LENGTH} characters or less`,
      };
    }

    // Security: explicit channel membership check before creating message or signed URLs
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("server_id, slowmode_seconds")
      .eq("id", channelId)
      .single();

    if (channelError || !channel) {
      return { error: "Channel not found" };
    }

    const { data: membership } = await supabase
      .from("server_members")
      .select("id, timeout_until")
      .eq("server_id", channel.server_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return { error: "You must be a member of this channel to send messages" };
    }
    if (membership.timeout_until && new Date(membership.timeout_until) > new Date()) {
      return { error: "You are timed out and cannot send messages" };
    }

    // Slowmode
    const slowmodeSec = channel.slowmode_seconds ?? 0;
    if (slowmodeSec > 0) {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("created_at")
        .eq("channel_id", channelId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (lastMsg?.created_at) {
        const elapsed = (Date.now() - new Date(lastMsg.created_at).getTime()) / 1000;
        if (elapsed < slowmodeSec) {
          return {
            error: `Please wait ${Math.ceil(slowmodeSec - elapsed)}s before sending again (slowmode).`,
          };
        }
      }
    }

    // AutoMod: apply server rules
    const { data: automodRules } = await supabase
      .from("automod_rules")
      .select("name, type, config, action")
      .eq("server_id", channel.server_id);

    for (const rule of automodRules ?? []) {
      let matched = false;
      if (rule.type === "keywords") {
        const keywords = (rule.config as { keywords?: string[] })?.keywords ?? [];
        const lower = trimmedContent.toLowerCase();
        if (keywords.some((k) => lower.includes(k.toLowerCase()))) {
          matched = true;
        }
      }
      if (rule.type === "profanity") {
        const bad = /\b(shit|damn|hell)\b/i;
        if (bad.test(trimmedContent)) matched = true;
      }
      if (matched) {
        if (rule.action === "block") {
          return {
            error: `Message blocked by AutoMod rule: ${rule.name ?? "Rule"}`,
          };
        }
      }
    }

    // Validate file metadata (server-validated contentType used for upload)
    if (hasFiles) {
      if (files.length > MAX_IMAGES_PER_MESSAGE) {
        return {
          error: `Maximum ${MAX_IMAGES_PER_MESSAGE} images per message`,
        };
      }
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      if (totalSize > MAX_TOTAL_ATTACHMENTS) {
        return {
          error: "Total attachment size must be under 4 MB",
        };
      }
      for (const file of files) {
        const allowed = ALLOWED_MIME_TYPES as readonly string[];
        if (!allowed.includes(file.type)) {
          return {
            error: `Invalid file type. Allowed: JPEG, PNG, GIF, WebP`,
          };
        }
        if (file.size > MAX_FILE_SIZE) {
          return { error: "Each image must be under 3 MB" };
        }
      }
    }

    if (threadId && isValidUUID(threadId)) {
      const { data: thread } = await supabase
        .from("threads")
        .select("id, channel_id, locked_at")
        .eq("id", threadId)
        .single();
      if (!thread || thread.channel_id !== channelId) {
        return { error: "Thread not found" };
      }
      if (thread.locked_at) {
        return { error: "This thread is locked" };
      }
    }

    const insertPayload: {
      channel_id: string;
      user_id: string;
      content: string;
      thread_id?: string;
    } = {
      channel_id: channelId,
      user_id: user.id,
      content: trimmedContent || "",
    };
    if (threadId && isValidUUID(threadId)) {
      insertPayload.thread_id = threadId;
    }

    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError) {
      console.log("MYDEBUG →", insertError);
      return { error: insertError.message };
    }

    const messageId = message.id;

    if (!hasFiles) {
      revalidatePath(`/chat`);
      return { success: true };
    }

    revalidatePath(`/chat`);
    return { messageId };
  } catch (err) {
    console.log("MYDEBUG →", err);
    return {
      error:
        err instanceof Error ? err.message : "Failed to send message. Please try again.",
    };
  }
}

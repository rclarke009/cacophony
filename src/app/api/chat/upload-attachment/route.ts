import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID } from "@/lib/validation";
import {
  ALLOWED_MIME_TYPES,
  MAX_IMAGES_PER_MESSAGE,
} from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { createHash } from "crypto";

/** 3 MB - stay under Vercel 4.5 MB request body limit */
const MAX_UPLOAD_FILE_SIZE = 3 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

function getContentAddressedPath(buffer: Buffer, contentType: string): string {
  const hash = createHash("sha256").update(buffer).digest("hex");
  const ext = MIME_TO_EXT[contentType] ?? "jpg";
  return `by-hash/${hash}.${ext}`;
}

/**
 * POST /api/chat/upload-attachment
 * Accepts multipart/form-data: channel_id, message_id, file.
 * Server uploads to Supabase with service role (bypasses RLS).
 * One file per request; Vercel 4.5 MB body limit applies.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const channelId = formData.get("channel_id") as string | null;
    const messageId = formData.get("message_id") as string | null;
    const file = formData.get("file") as File | null;

    if (!channelId || !messageId || !file) {
      return NextResponse.json(
        { error: "channel_id, message_id, and file are required" },
        { status: 400 }
      );
    }

    if (!isValidUUID(channelId) || !isValidUUID(messageId)) {
      return NextResponse.json({ error: "Invalid channel or message" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Validate channel membership
    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("server_id")
      .eq("id", channelId)
      .single();

    if (channelError || !channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("server_members")
      .select("id")
      .eq("server_id", channel.server_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member of this channel to upload" },
        { status: 403 }
      );
    }

    // Validate message exists and belongs to channel
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("id")
      .eq("id", messageId)
      .eq("channel_id", channelId)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Validate file
    const allowed = ALLOWED_MIME_TYPES as readonly string[];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      return NextResponse.json(
        { error: "Each image must be under 3 MB" },
        { status: 400 }
      );
    }

    // Check attachment count for this message
    const admin = createAdminClient();
    const { count } = await admin
      .from("attachments")
      .select("id", { count: "exact", head: true })
      .eq("message_id", messageId);

    if ((count ?? 0) >= MAX_IMAGES_PER_MESSAGE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES_PER_MESSAGE} images per message` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const path = getContentAddressedPath(buffer, file.type);

    // Deduplicate: only upload if this exact content isn't already stored
    const { error: existsError } = await admin.storage
      .from("attachments")
      .download(path);

    if (existsError) {
      const { error: uploadError } = await admin.storage
        .from("attachments")
        .upload(path, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.log("MYDEBUG →", uploadError);
        return NextResponse.json(
          { error: uploadError.message ?? "Failed to upload image" },
          { status: 500 }
        );
      }
    }

    const { error: attachError } = await admin.from("attachments").insert({
      message_id: messageId,
      file_path: path,
      file_type: "image",
    });

    if (attachError) {
      console.log("MYDEBUG →", attachError);
      return NextResponse.json(
        { error: attachError.message ?? "Failed to save attachment" },
        { status: 500 }
      );
    }

    revalidatePath(`/chat`);
    return NextResponse.json({ success: true, messageId });
  } catch (err) {
    console.log("MYDEBUG →", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to upload. Please try again.",
      },
      { status: 500 }
    );
  }
}

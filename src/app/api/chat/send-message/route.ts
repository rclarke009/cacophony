import { NextResponse, type NextRequest } from "next/server";
import { prepareMessageWithUploads } from "@/app/actions/messages";

/**
 * POST /api/chat/send-message
 * Accepts JSON: { channel_id, content, files?: [{ name, size, type }] }. Returns JSON.
 * For messages with files: returns { messageId, uploads } so client can upload directly
 * to Supabase (bypassing Vercel's 4.5 MB limit). For text-only: returns { success: true }.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const channelId = body.channel_id as string;
    const content = (body.content as string) ?? "";
    const files = (body.files as Array<{ name: string; size: number; type: string }>) ?? [];

    const result = await prepareMessageWithUploads({
      channelId,
      content,
      files: files.length > 0 ? files : undefined,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.log("MYDEBUG →", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to send message. Please try again.",
      },
      { status: 500 }
    );
  }
}

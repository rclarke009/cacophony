import { NextResponse, type NextRequest } from "next/server";
import { prepareMessageWithUploads } from "@/app/actions/messages";
import { logger } from "@/lib/logger";

/**
 * POST /api/chat/send-message
 * Accepts JSON: { channel_id, content, files?: [{ name, size, type }] }. Returns JSON.
 * For messages with files: returns { messageId, uploads } so client can upload directly
 * to Supabase (bypassing Vercel's 4.5 MB limit). For text-only: returns { success: true }.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  const requestId = request.headers.get("x-request-id") ?? undefined;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      logger.info("send_message", {
        request_id: requestId,
        duration_ms: Date.now() - start,
        status: 400,
        error: "invalid_content_type",
      });
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const channelId = body.channel_id as string;
    const content = (body.content as string) ?? "";
    const threadId = body.thread_id as string | undefined;
    const files = (body.files as Array<{ name: string; size: number; type: string }>) ?? [];

    const result = await prepareMessageWithUploads({
      channelId,
      content,
      threadId: threadId && typeof threadId === "string" ? threadId : undefined,
      files: files.length > 0 ? files : undefined,
    });

    if ("error" in result) {
      logger.info("send_message", {
        request_id: requestId,
        duration_ms: Date.now() - start,
        status: 400,
        error: result.error,
        channel_id: channelId,
      });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    logger.info("send_message", {
      request_id: requestId,
      duration_ms: Date.now() - start,
      status: 200,
      channel_id: channelId,
      has_uploads: "messageId" in result,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.log("MYDEBUG →", err);
    logger.error("send_message", {
      request_id: requestId,
      duration_ms: Date.now() - start,
      status: 500,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to send message. Please try again.",
      },
      { status: 500 }
    );
  }
}

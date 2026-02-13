import { NextResponse, type NextRequest } from "next/server";
import { sendMessage } from "@/app/actions/messages";

/**
 * POST /api/chat/send-message
 * Accepts FormData (channel_id, content, files?) and returns JSON.
 * Use this for message submit so we always return JSON and avoid
 * Next.js server action 400 / "unexpected response" with file uploads.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await sendMessage(formData);

    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
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

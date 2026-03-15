import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { MESSAGES_PAGE_SIZE } from "@/lib/constants";
import { logger } from "@/lib/logger";

interface Attachment {
  id: string;
  file_path: string;
  file_type: string;
  signed_url?: string | null;
}

interface PageProps {
  params: Promise<{ serverId: string; channelId: string }>;
}

const SIGNED_URL_EXPIRY = 3600; // 1 hour

export default async function ChannelPage({ params }: PageProps) {
  const start = Date.now();
  const { serverId, channelId } = await params;
  const headersList = await headers();
  const requestId = headersList.get("x-request-id") ?? undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .select("id, name, server_id")
    .eq("id", channelId)
    .single();

  if (channelError || !channel || channel.server_id !== serverId) {
    notFound();
  }

  const { data: messagesDesc } = await supabase
    .from("messages")
    .select("id, content, created_at, user_id, attachments(id, file_path, file_type)")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(MESSAGES_PAGE_SIZE);
  const messages = (messagesDesc ?? []).slice().reverse();

  const rawAttachmentCount = (messages ?? []).reduce(
    (n, m) => n + ((m.attachments as Attachment[] | undefined)?.length ?? 0),
    0
  );
  logger.info("channel_page_messages", {
    request_id: requestId,
    channel_id: channelId,
    message_count: messages.length,
    raw_attachment_count: rawAttachmentCount,
  });

  const userIds = [...new Set((messages ?? []).map((m) => m.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.username])
  );

  const { data: myMembership } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();

  let firstSignedUrlLogDone = false;
  const initialMessages = await Promise.all(
    (messages ?? []).map(async (m) => {
      const attachments = (m.attachments ?? []) as Attachment[];
      const attachmentsWithUrls = await Promise.all(
        attachments
          .filter((a) => a.file_type === "image")
          .map(async (a) => {
            const { data, error } = await supabase.storage
              .from("attachments")
              .createSignedUrl(a.file_path, SIGNED_URL_EXPIRY);
            if (!firstSignedUrlLogDone) {
              firstSignedUrlLogDone = true;
              logger.info("createSignedUrl_sample", {
                request_id: requestId,
                file_path: a.file_path,
                attachment_id: a.id,
                has_error: !!error,
                error_message: error?.message ?? null,
                has_signed_url: !!(data?.signedUrl),
              });
            }
            if (error) {
              logger.warn("createSignedUrl failed", {
                request_id: requestId,
                file_path: a.file_path,
                attachment_id: a.id,
                error: error.message,
              });
            }
            return { ...a, signed_url: data?.signedUrl ?? null };
          })
      );
      return {
        ...m,
        username: profileMap.get(m.user_id) ?? null,
        attachments: attachmentsWithUrls,
      };
    })
  );

  const totalAttachments = initialMessages.reduce(
    (n, m) => n + (m.attachments?.length ?? 0),
    0
  );
  const withNullUrl = initialMessages.flatMap((m) =>
    (m.attachments ?? []).filter((a) => !a.signed_url)
  );
  logger.info("channel_page_attachments", {
    request_id: requestId,
    channel_id: channelId,
    total_attachments: totalAttachments,
    attachments_with_null_url: withNullUrl.length,
    sample_path: withNullUrl[0]?.file_path ?? null,
  });

  logger.info("channel_page", {
    request_id: requestId,
    channel_id: channelId,
    duration_ms: Date.now() - start,
    message_count: initialMessages.length,
  });

  return (
    <>
      <MessageList
        serverId={serverId}
        channelId={channelId}
        initialMessages={initialMessages}
        channelName={channel.name}
        currentUserId={user.id}
        isModerator={myMembership?.role === "owner" || myMembership?.role === "admin"}
      />
      <MessageInput serverId={serverId} channelId={channelId} />
    </>
  );
}

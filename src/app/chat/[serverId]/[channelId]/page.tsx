import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";

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
  const { serverId, channelId } = await params;
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

  const { data: messages } = await supabase
    .from("messages")
    .select("id, content, created_at, user_id, attachments(id, file_path, file_type)")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });

  const userIds = [...new Set((messages ?? []).map((m) => m.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.username])
  );

  const initialMessages = await Promise.all(
    (messages ?? []).map(async (m) => {
      const attachments = (m.attachments ?? []) as Attachment[];
      const attachmentsWithUrls = await Promise.all(
        attachments
          .filter((a) => a.file_type === "image")
          .map(async (a) => {
            const { data } = await supabase.storage
              .from("attachments")
              .createSignedUrl(a.file_path, SIGNED_URL_EXPIRY);
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

  return (
    <>
      <MessageList
        channelId={channelId}
        initialMessages={initialMessages}
        channelName={channel.name}
      />
      <MessageInput channelId={channelId} />
    </>
  );
}

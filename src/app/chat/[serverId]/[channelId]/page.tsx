import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";

interface PageProps {
  params: Promise<{ serverId: string; channelId: string }>;
}

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
    .select("id, content, created_at, user_id")
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

  const initialMessages = (messages ?? []).map((m) => ({
    ...m,
    username: profileMap.get(m.user_id) ?? null,
  }));

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

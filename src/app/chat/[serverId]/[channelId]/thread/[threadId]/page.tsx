import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThreadView } from "@/components/chat/thread-view";
import { MessageInput } from "@/components/chat/message-input";

interface PageProps {
  params: Promise<{ serverId: string; channelId: string; threadId: string }>;
}

export default async function ThreadPage({ params }: PageProps) {
  const { serverId, channelId, threadId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .select("id, channel_id, root_message_id, title, locked_at, archived_at")
    .eq("id", threadId)
    .single();

  if (threadError || !thread || thread.channel_id !== channelId) notFound();

  const { data: channel } = await supabase
    .from("channels")
    .select("server_id, name")
    .eq("id", channelId)
    .single();

  if (!channel || channel.server_id !== serverId) notFound();

  const { data: membership } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  const { data: rootMessage } = await supabase
    .from("messages")
    .select("id, content, created_at, user_id")
    .eq("id", thread.root_message_id)
    .single();

  const { data: replyMessages } = await supabase
    .from("messages")
    .select("id, content, created_at, user_id")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  const userIds: string[] = [
    ...new Set(
      [
        rootMessage?.user_id,
        ...(replyMessages ?? []).map((m) => m.user_id),
      ].filter((x): x is string => Boolean(x))
    ),
  ];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));

  const isModerator = membership.role === "owner" || membership.role === "admin";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
      <div className="flex h-12 items-center gap-2 border-b border-border px-4">
        <Link
          href={`/chat/${serverId}/${channelId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          # {channel.name}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-semibold text-foreground">{thread.title}</h1>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ThreadView
            serverId={serverId}
            threadId={threadId}
            rootMessage={
              rootMessage
                ? {
                    ...rootMessage,
                    username: profileMap.get(rootMessage.user_id) ?? null,
                  }
                : null
            }
            replies={(replyMessages ?? []).map((m) => ({
              ...m,
              username: profileMap.get(m.user_id) ?? null,
            }))}
            isLocked={!!thread.locked_at}
            isArchived={!!thread.archived_at}
            isModerator={isModerator}
          />
        </div>
        {!thread.locked_at && (
          <MessageInput
            serverId={serverId}
            channelId={channelId}
            threadId={threadId}
          />
        )}
      </div>
    </div>
  );
}

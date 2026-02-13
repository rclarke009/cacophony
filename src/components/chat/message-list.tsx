"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Attachment {
  id: string;
  file_path: string;
  file_type: string;
  signed_url?: string | null;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username?: string | null;
  attachments?: Attachment[];
}

interface MessageListProps {
  channelId: string;
  initialMessages: Message[];
  channelName: string;
}

const SIGNED_URL_EXPIRY = 3600; // 1 hour

async function getSignedUrls(
  supabase: ReturnType<typeof createClient>,
  attachments: Attachment[]
): Promise<Attachment[]> {
  const imageAttachments = attachments.filter((a) => a.file_type === "image");
  const results = await Promise.all(
    imageAttachments.map(async (a) => {
      const { data } = await supabase.storage
        .from("attachments")
        .createSignedUrl(a.file_path, SIGNED_URL_EXPIRY);
      return { ...a, signed_url: data?.signedUrl ?? null };
    })
  );
  return results;
}

export function MessageList({
  channelId,
  initialMessages,
  channelName,
}: MessageListProps) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = initialMessages } = useQuery({
    queryKey: ["messages", channelId],
    queryFn: async () => {
      const supabase = createClient();
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("id, content, created_at, user_id, attachments(id, file_path, file_type)")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const userIds = [...new Set((msgs ?? []).map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p.username])
      );

      const messagesWithUrls = await Promise.all(
        (msgs ?? []).map(async (m) => {
          const attachments = (m.attachments ?? []) as Attachment[];
          const attachmentsWithUrls =
            attachments.length > 0
              ? await getSignedUrls(supabase, attachments)
              : [];
          return {
            ...m,
            username: profileMap.get(m.user_id) ?? null,
            attachments: attachmentsWithUrls,
          };
        })
      );

      return messagesWithUrls as Message[];
    },
    initialData: initialMessages,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED")
          console.log("MYDEBUG →", "Realtime subscribed");
        if (status === "CHANNEL_ERROR")
          console.log("MYDEBUG →", "Realtime error", err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-card">
      <div className="channel-header flex h-12 items-center border-b border-border px-4">
        <h1 className="font-semibold text-foreground"># {channelName}</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages yet. Say something!
            </p>
          ) : (
            messages.map((msg) => {
              const isAction = msg.content.startsWith("*");
              return (
                <div key={msg.id} className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-foreground">
                      {msg.username ?? "Anonymous"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString("en-US", {
                        month: "numeric",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {msg.content ? (
                    <p
                      className={`font-mono text-sm text-card-foreground ${isAction ? "message-action" : ""}`}
                    >
                      {msg.content}
                    </p>
                  ) : null}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {msg.attachments.map((att) =>
                        att.signed_url ? (
                          <a
                            key={att.id}
                            href={att.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={att.signed_url}
                              alt=""
                              className="max-h-64 max-w-full rounded border border-border object-contain"
                            />
                          </a>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    </div>
  );
}

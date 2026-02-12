"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username?: string | null;
}

interface MessageListProps {
  channelId: string;
  initialMessages: Message[];
  channelName: string;
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
        .select("id, content, created_at, user_id")
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

      return (msgs ?? []).map((m) => ({
        ...m,
        username: profileMap.get(m.user_id) ?? null,
      })) as Message[];
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-12 items-center border-b border-zinc-800 px-4">
        <h1 className="font-semibold text-zinc-100"># {channelName}</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No messages yet. Say something!
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-zinc-200">
                    {msg.username ?? "Anonymous"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="font-mono text-sm text-zinc-300">{msg.content}</p>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/context-menu";
import {
  deleteMessage,
  createReport,
  timeoutMember,
  kickMember,
  banMember,
  warnMember,
  setVoiceMute,
  createThread,
} from "@/app/actions/moderation";

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
  serverId: string;
  channelId: string;
  initialMessages: Message[];
  channelName: string;
  currentUserId: string;
  isModerator: boolean;
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

type MenuTarget =
  | { type: "message"; messageId: string; userId: string }
  | { type: "user"; userId: string; username: string | null };

export function MessageList({
  serverId,
  channelId,
  initialMessages,
  channelName,
  currentUserId,
  isModerator,
}: MessageListProps) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: MenuTarget;
  } | null>(null);

  const closeMenu = useCallback(() => setContextMenu(null), []);

  const handleMessageContextMenu = useCallback(
    (e: React.MouseEvent, msg: Message) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        target: { type: "message", messageId: msg.id, userId: msg.user_id },
      });
    },
    []
  );

  const handleUserContextMenu = useCallback(
    (e: React.MouseEvent, userId: string, username: string | null) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        target: { type: "user", userId, username },
      });
    },
    []
  );

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
          console.log("MYDEBUG →", {
            msgId: m.id,
            attachments,
            attachmentsWithUrls,
          });
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

  const messageMenuItems = (msgId: string, msgUserId: string): ContextMenuItem[] => {
    const canDelete = currentUserId === msgUserId || isModerator;
    const items: ContextMenuItem[] = [];
    if (canDelete) {
      items.push({
        label: "Delete message",
        variant: "destructive",
        onClick: async () => {
          const r = await deleteMessage(msgId, serverId);
          if ("error" in r) {
            console.log("MYDEBUG →", r.error);
          } else {
            queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
          }
        },
      });
    }
    items.push({
      label: "Start thread",
      onClick: async () => {
        const title = window.prompt("Thread title (optional)") ?? "Thread";
        const r = await createThread(channelId, serverId, msgId, title);
        if ("error" in r) {
          console.log("MYDEBUG →", r.error);
        } else {
          window.location.href = `/chat/${serverId}/${channelId}/thread/${r.threadId}`;
        }
      },
    });
    items.push({
      label: "Report message",
      onClick: async () => {
        await createReport(serverId, {
          reportedMessageId: msgId,
          reportedUserId: msgUserId,
          reason: null,
        });
      },
    });
    return items;
  };

  const userMenuItems = (targetUserId: string): ContextMenuItem[] => {
    if (!isModerator || targetUserId === currentUserId) return [];
    const items: ContextMenuItem[] = [
      {
        label: "Timeout 5m",
        onClick: () => timeoutMember(serverId, targetUserId, 5),
      },
      {
        label: "Timeout 1h",
        onClick: () => timeoutMember(serverId, targetUserId, 60),
      },
      {
        label: "Kick",
        onClick: () => kickMember(serverId, targetUserId, null),
      },
      {
        label: "Ban",
        variant: "destructive",
        onClick: () => banMember(serverId, targetUserId, null),
      },
      {
        label: "Warn",
        onClick: () => warnMember(serverId, targetUserId, null),
      },
      {
        label: "Mute in voice",
        onClick: () =>
          setVoiceMute(
            serverId,
            targetUserId,
            new Date(Date.now() + 24 * 60 * 60 * 1000)
          ),
      },
    ];
    return items;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
      <div className="channel-header flex h-12 items-center border-b border-border px-4">
        <h1 className="font-semibold text-foreground"># {channelName}</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 p-4">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages yet. Say something!
            </p>
          ) : (
            messages.map((msg) => {
              const isAction = msg.content.startsWith("*");
              return (
                <div
                  key={msg.id}
                  className="flex flex-col gap-0.5"
                  onContextMenu={(e) => handleMessageContextMenu(e, msg)}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-medium text-foreground cursor-context-menu"
                      onContextMenu={(e) =>
                        handleUserContextMenu(e, msg.user_id, msg.username ?? null)
                      }
                    >
                      {msg.username ?? "Anonymous"}
                    </span>
                    <span
                      className="text-xs text-muted-foreground"
                      suppressHydrationWarning
                    >
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
      </div>

      {contextMenu &&
        (() => {
          const items =
            contextMenu.target.type === "message"
              ? messageMenuItems(
                  contextMenu.target.messageId,
                  contextMenu.target.userId
                )
              : userMenuItems(contextMenu.target.userId);
          if (items.length === 0) return null;
          return (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              items={items}
              onClose={closeMenu}
            />
          );
        })()}
    </div>
  );
}

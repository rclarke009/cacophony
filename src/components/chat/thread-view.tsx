"use client";

import { Button } from "@/components/ui/button";
import {
  lockThread,
  unlockThread,
  archiveThread,
  deleteThread,
} from "@/app/actions/moderation";

interface Msg {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string | null;
}

interface ThreadViewProps {
  serverId: string;
  threadId: string;
  rootMessage: Msg | null;
  replies: Msg[];
  isLocked: boolean;
  isArchived: boolean;
  isModerator: boolean;
}

export function ThreadView({
  serverId,
  threadId,
  rootMessage,
  replies,
  isLocked,
  isArchived,
  isModerator,
}: ThreadViewProps) {
  async function handleLock() {
    await lockThread(threadId, serverId);
    window.location.reload();
  }
  async function handleUnlock() {
    await unlockThread(threadId, serverId);
    window.location.reload();
  }
  async function handleArchive() {
    await archiveThread(threadId, serverId);
    window.location.reload();
  }
  async function handleDelete() {
    if (!confirm("Delete this thread and all replies?")) return;
    await deleteThread(threadId, serverId);
    window.location.href = `/chat/${serverId}`;
  }

  return (
    <div className="space-y-4">
      {isModerator && (
        <div className="flex flex-wrap gap-2">
          {isLocked ? (
            <Button size="sm" variant="outline" onClick={handleUnlock}>
              Unlock thread
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleLock}>
              Lock thread
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleArchive}>
            Archive
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDelete}>
            Delete thread
          </Button>
        </div>
      )}
      {isLocked && (
        <p className="text-sm text-muted-foreground">This thread is locked.</p>
      )}
      {rootMessage && (
        <div className="rounded-md border border-border p-3">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-medium">{rootMessage.username ?? "Unknown"}</span>
            <span className="text-muted-foreground">
              {new Date(rootMessage.created_at).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm">{rootMessage.content}</p>
        </div>
      )}
      <div className="space-y-2">
        {replies.map((m) => (
          <div key={m.id} className="rounded-md border border-border p-3">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-medium">{m.username ?? "Unknown"}</span>
              <span className="text-muted-foreground">
                {new Date(m.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 font-mono text-sm">{m.content}</p>
          </div>
        ))}
      </div>
      {replies.length === 0 && (
        <p className="text-sm text-muted-foreground">No replies yet.</p>
      )}
    </div>
  );
}

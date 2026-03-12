"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_FILE_SIZE,
  MAX_IMAGES_PER_MESSAGE,
  MAX_MESSAGE_CONTENT_LENGTH,
  MAX_TOTAL_ATTACHMENTS,
} from "@/lib/constants";
import { ImagePlus, X } from "lucide-react";
import {
  timeoutMember,
  kickMember,
  banMember,
  warnMember,
  deleteMessage,
  deleteMessagesBulk,
  getServerMemberIdByUsername,
  getLastMessageIdsInChannel,
} from "@/app/actions/moderation";

interface MessageInputProps {
  serverId: string;
  channelId: string;
  threadId?: string;
}

const DURATION_MINUTES: Record<string, number> = {
  m: 1,
  min: 1,
  mins: 1,
  h: 60,
  hr: 60,
  hrs: 60,
  d: 24 * 60,
  day: 24 * 60,
  days: 24 * 60,
};

export function MessageInput({ serverId, channelId, threadId }: MessageInputProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSlashCommand(content: string): Promise<boolean> {
    const trimmed = content.trim();
    if (!trimmed.startsWith("/")) return false;
    const parts = trimmed.slice(1).trim().split(/\s+/);
    const cmd = (parts[0] ?? "").toLowerCase();
    if (!cmd) return false;

    const resolveUser = async (arg: string): Promise<string | null> => {
      const username = arg.startsWith("@") ? arg.slice(1) : arg;
      const r = await getServerMemberIdByUsername(serverId, username);
      if ("error" in r) {
        setError(r.error);
        return null;
      }
      return r.userId;
    };

    const parseDuration = (arg: string): number | null => {
      const match = arg.match(/^(\d+)\s*(m|min|mins|h|hr|hrs|d|day|days)?$/i);
      if (!match) return null;
      const n = parseInt(match[1], 10);
      const unit = (match[2] ?? "m").toLowerCase();
      const mult = DURATION_MINUTES[unit] ?? 1;
      return n * mult;
    };

    if (cmd === "timeout" && parts.length >= 3) {
      const userId = await resolveUser(parts[1]);
      if (!userId) return true;
      const duration = parseDuration(parts[2]);
      if (duration == null || duration < 1) {
        setError("Usage: /timeout @user 5m|1h|1d");
        return true;
      }
      const r = await timeoutMember(serverId, userId, duration);
      if ("error" in r) setError(r.error);
      else {
        setError(null);
        queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
      }
      return true;
    }
    if (cmd === "kick" && parts.length >= 2) {
      const userId = await resolveUser(parts[1]);
      if (!userId) return true;
      const reason = parts.slice(2).join(" ") || null;
      const r = await kickMember(serverId, userId, reason);
      if ("error" in r) setError(r.error);
      else {
        setError(null);
        queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
      }
      return true;
    }
    if (cmd === "ban" && parts.length >= 2) {
      const userId = await resolveUser(parts[1]);
      if (!userId) return true;
      const reason = parts.slice(2).join(" ") || null;
      const r = await banMember(serverId, userId, reason);
      if ("error" in r) setError(r.error);
      else {
        setError(null);
        queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
      }
      return true;
    }
    if (cmd === "warn" && parts.length >= 2) {
      const userId = await resolveUser(parts[1]);
      if (!userId) return true;
      const reason = parts.slice(2).join(" ") || null;
      const r = await warnMember(serverId, userId, reason);
      if ("error" in r) setError(r.error);
      else {
        setError(null);
        queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
      }
      return true;
    }
    if (cmd === "delete" && parts.length >= 1) {
      const arg = parts[1];
      if (arg?.toLowerCase() === "last" && parts[2]) {
        const n = parseInt(parts[2], 10);
        if (Number.isNaN(n) || n < 1 || n > 100) {
          setError("Usage: /delete last <1-100>");
          return true;
        }
        const idsR = await getLastMessageIdsInChannel(channelId, serverId, n);
        if ("error" in idsR) {
          setError(idsR.error);
          return true;
        }
        const r = await deleteMessagesBulk(idsR.messageIds, serverId);
        if ("error" in r) setError(r.error);
        else {
          setError(null);
          queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
        }
        return true;
      }
      if (arg && /^[0-9a-f-]{36}$/i.test(arg)) {
        const r = await deleteMessage(arg, serverId);
        if ("error" in r) setError(r.error);
        else {
          setError(null);
          queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
        }
        return true;
      }
      setError("Usage: /delete <message_id> or /delete last <n>");
      return true;
    }
    setError(`Unknown command: /${cmd}. Try /timeout, /kick, /ban, /warn, /delete`);
    return true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = formRef.current;
    if (!form) return;

    const content = (form.elements.namedItem("content") as HTMLInputElement)?.value ?? "";

    if (content.trim().startsWith("/")) {
      const handled = await handleSlashCommand(content);
      if (handled) {
        form.reset();
        setSelectedFiles([]);
      }
      return;
    }

    const body: {
      channel_id: string;
      content: string;
      thread_id?: string;
      files?: Array<{ name: string; size: number; type: string }>;
    } = {
      channel_id: channelId,
      content,
    };
    if (threadId) body.thread_id = threadId;
    if (selectedFiles.length > 0) {
      body.files = selectedFiles.map((f) => ({ name: f.name, size: f.size, type: f.type }));
    }

    try {
      const search = typeof window !== "undefined" ? window.location.search : "";
      const res = await fetch(`/api/chat/send-message${search}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let result: {
        error?: string;
        success?: boolean;
        messageId?: string;
      } = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        console.log("MYDEBUG →", "Non-JSON response", res.status, text?.slice(0, 200));
      }

      if (!res.ok) {
        setError(result?.error ?? "Failed to send message");
        console.log("MYDEBUG →", result?.error);
        return;
      }
      if (result?.error) {
        setError(result.error);
        console.log("MYDEBUG →", result.error);
        return;
      }

      // Server upload: POST each file to /api/chat/upload-attachment
      if (result.messageId && selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const formData = new FormData();
          formData.append("channel_id", channelId);
          formData.append("message_id", result.messageId);
          formData.append("file", selectedFiles[i]);

          const uploadRes = await fetch(`/api/chat/upload-attachment${search}`, {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}));
            setError(errData?.error ?? "Failed to upload image");
            console.log("MYDEBUG →", errData?.error);
            return;
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
      if (threadId) {
        queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
      }
      setSelectedFiles([]);
      form.reset();
    } catch (err) {
      setError("Failed to send message. Please try again.");
      console.log("MYDEBUG →", err);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const files = Array.from(e.target.files ?? []);
    const images = files.filter((f) =>
      ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(f.type)
    );
    const valid = images.filter((f) => f.size <= MAX_FILE_SIZE);
    const oversized = images.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setError(
        `Some images were too large (max 3 MB each). ${oversized.length} skipped.`
      );
    }
    setSelectedFiles((prev) => {
      const all = [...prev, ...valid];
      const combined: File[] = [];
      let total = 0;
      for (const f of all) {
        if (combined.length >= MAX_IMAGES_PER_MESSAGE) break;
        if (total + f.size <= MAX_TOTAL_ATTACHMENTS) {
          combined.push(f);
          total += f.size;
        } else {
          setError("Total attachment size limited to 4 MB. Some images were not added.");
          break;
        }
      }
      return combined;
    });
    e.target.value = "";
  }

  function removeFile(index: number) {
    setError(null);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 border-t border-border bg-muted/50 p-4"
    >
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFiles.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="relative inline-block"
            >
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="h-16 w-16 rounded object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground hover:bg-destructive/90"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0"
          aria-label="Add image"
        >
          <ImagePlus className="h-5 w-5" />
        </Button>
        <Input
          name="content"
          placeholder="Type a message..."
          className="flex-1 bg-background"
          autoComplete="off"
          maxLength={MAX_MESSAGE_CONTENT_LENGTH}
          onChange={() => setError(null)}
        />
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? "Sending..." : "Send"}
    </Button>
  );
}

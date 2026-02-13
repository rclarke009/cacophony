"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createServer } from "@/app/actions/servers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SERVER_EMOJI_OPTIONS = [
  "🏠",
  "🎮",
  "💬",
  "🎵",
  "📚",
  "📷",
  "🎨",
  "🚀",
  "🎯",
  "⭐",
  "🔥",
  "🌟",
  "💼",
  "🎪",
  "🎭",
  "🎬",
  "📱",
  "💻",
  "🎸",
  "🎹",
  "🏆",
  "🌈",
  "🎁",
  "📌",
];

interface CreateServerDialogProps {
  trigger?: React.ReactNode;
}

export function CreateServerDialog({ trigger }: CreateServerDialogProps) {
  const [state, formAction] = useActionState(createServer, null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            title="Create server"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Create server</DialogTitle>
            <DialogDescription>
              Give your server a name and pick an icon so you can tell it apart.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="server-name">Server name</Label>
              <Input
                id="server-name"
                name="name"
                placeholder="My Server"
                required
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Server icon</Label>
              <input
                type="hidden"
                name="icon_emoji"
                value={selectedEmoji ?? ""}
              />
              <div className="flex flex-wrap gap-2">
                {SERVER_EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() =>
                      setSelectedEmoji((prev) => (prev === emoji ? null : emoji))
                    }
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors hover:bg-sidebar-accent ${
                      selectedEmoji === emoji
                        ? "bg-sidebar-primary text-sidebar-primary-foreground ring-2 ring-sidebar-primary"
                        : "bg-sidebar-accent"
                    }`}
                    aria-label={`Select ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {selectedEmoji && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedEmoji} — click again to clear
                </p>
              )}
            </div>
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

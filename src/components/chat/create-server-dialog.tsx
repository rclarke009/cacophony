"use client";

import { useState, useRef } from "react";
import { useActionState } from "react";
import { Plus, ImageIcon } from "lucide-react";
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

const SERVER_COLOR_OPTIONS = [
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#f97316",
  "#06b6d4",
  "#eab308",
  "#ec4899",
  "#64748b",
  "#14b8a6",
];

interface CreateServerDialogProps {
  trigger?: React.ReactNode;
}

export function CreateServerDialog({ trigger }: CreateServerDialogProps) {
  const [state, formAction] = useActionState(createServer, null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearAllIcons = () => {
    setSelectedEmoji(null);
    setSelectedColor(null);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const selectEmoji = (emoji: string) => {
    if (selectedEmoji === emoji) {
      setSelectedEmoji(null);
    } else {
      setSelectedEmoji(emoji);
      setSelectedColor(null);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  };

  const selectColor = (color: string) => {
    if (selectedColor === color) {
      setSelectedColor(null);
    } else {
      setSelectedColor(color);
      setSelectedEmoji(null);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSelectedEmoji(null);
      setSelectedColor(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

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
        <form action={formAction} encType="multipart/form-data">
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
              <input
                type="hidden"
                name="icon_color"
                value={selectedColor ?? ""}
              />
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Emoji
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SERVER_EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => selectEmoji(emoji)}
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
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Color
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SERVER_COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => selectColor(color)}
                        className={`h-10 w-10 shrink-0 rounded-lg transition-all hover:scale-110 ${
                          selectedColor === color
                            ? "ring-2 ring-sidebar-primary ring-offset-2 ring-offset-background"
                            : ""
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Custom image
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      key={selectedFile ? "has-file" : "no-file"}
                      ref={fileInputRef}
                      type="file"
                      name="icon_file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      {selectedFile ? "Change image" : "Upload image"}
                    </Button>
                    {selectedFile && (
                      <>
                        <div className="h-10 w-10 overflow-hidden rounded-lg border">
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearFile}
                        >
                          Clear
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPEG, PNG, GIF, or WebP. Max 2 MB.
                  </p>
                </div>
              </div>
              {(selectedEmoji || selectedColor || selectedFile) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllIcons}
                  className="mt-2"
                >
                  Clear icon
                </Button>
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

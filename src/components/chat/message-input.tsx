"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage } from "@/app/actions/messages";
import { ImagePlus, X } from "lucide-react";

interface MessageInputProps {
  channelId: string;
}

export function MessageInput({ channelId }: MessageInputProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  async function handleSubmit(formData: FormData) {
    formData.set("channel_id", channelId);
    selectedFiles.forEach((file) => formData.append("files", file));
    // #region agent log
    const totalSize = selectedFiles.reduce((s, f) => s + f.size, 0);
    fetch("http://127.0.0.1:7246/ingest/a980a933-dca8-4b08-ab47-6af3254c5013", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "message-input.tsx:handleSubmit",
        message: "Before sendMessage",
        data: {
          fileCount: selectedFiles.length,
          totalSizeBytes: totalSize,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
          fileSizes: selectedFiles.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        },
        timestamp: Date.now(),
        hypothesisId: "H1_H2",
      }),
    }).catch(() => {});
    // #endregion
    const result = await sendMessage(formData);
    if (!result?.error) {
      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
      setSelectedFiles([]);
      formRef.current?.reset();
    } else {
      console.log("MYDEBUG →", result.error);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const images = files.filter((f) =>
      ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(f.type)
    );
    setSelectedFiles((prev) => {
      const combined = [...prev, ...images].slice(0, 5);
      return combined;
    });
    e.target.value = "";
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex flex-col gap-2 border-t border-border bg-muted/50 p-4"
    >
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

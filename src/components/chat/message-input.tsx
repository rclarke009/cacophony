"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage } from "@/app/actions/messages";

interface MessageInputProps {
  channelId: string;
}

export function MessageInput({ channelId }: MessageInputProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  async function handleSubmit(formData: FormData) {
    formData.set("channel_id", channelId);
    const result = await sendMessage(formData);
    if (!result?.error) {
      queryClient.invalidateQueries({ queryKey: ["messages", channelId] });
    }
    formRef.current?.reset();
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex gap-2 border-t border-zinc-800 bg-zinc-900/30 p-4"
    >
      <Input
        name="content"
        placeholder="Type a message..."
        className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
        autoComplete="off"
      />
      <SubmitButton />
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

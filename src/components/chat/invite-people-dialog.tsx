"use client";

import { useState, useCallback } from "react";
import { UserPlus } from "lucide-react";
import { createInvite } from "@/app/actions/invites";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface InvitePeopleDialogProps {
  serverId: string;
}

export function InvitePeopleDialog({ serverId }: InvitePeopleDialogProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<
    { code: string; maxUses: number } | { error: string } | null
  >(null);
  const [copied, setCopied] = useState(false);

  const handleOpenChange = useCallback(
    async (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        setResult(null);
        const data = await createInvite(serverId);
        setResult(data);
      }
    },
    [serverId]
  );

  const handleCopy = useCallback(() => {
    if (!result || "error" in result) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${result.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  const inviteUrl =
    result && !("error" in result) && typeof window !== "undefined"
      ? `${window.location.origin}/join/${result.code}`
      : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <UserPlus className="h-4 w-4" />
          Invite people
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription>
            Share this link to invite people to this server.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {result === null && (
            <p className="text-sm text-muted-foreground">Creating invite…</p>
          )}
          {result && "error" in result && (
            <p className="text-sm text-destructive">{result.error}</p>
          )}
          {result && !("error" in result) && (
            <>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteUrl}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Link works for {result.maxUses} people.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

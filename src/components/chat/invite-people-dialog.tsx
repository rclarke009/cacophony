"use client";

import { useState, useCallback, useEffect } from "react";
import { UserPlus, Link2, User } from "lucide-react";
import { createInvite } from "@/app/actions/invites";
import { sendDirectInvite } from "@/app/actions/direct-invites";
import {
  getKnownUsersForInvite,
  searchUsersByUsername,
  type InviteableUser,
} from "@/app/actions/invite-queries";
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

type Tab = "link" | "user";

export function InvitePeopleDialog({ serverId }: InvitePeopleDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("link");
  const [result, setResult] = useState<
    { code: string; maxUses: number } | { error: string } | null
  >(null);
  const [copied, setCopied] = useState(false);

  const [knownUsers, setKnownUsers] = useState<InviteableUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InviteableUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [directInviteFeedback, setDirectInviteFeedback] = useState<
    { success: string } | { error: string } | null
  >(null);

  const handleOpenChange = useCallback(
    async (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        setResult(null);
        setDirectInviteFeedback(null);
        setSearchQuery("");
        setSearchResults([]);
        if (tab === "link") {
          const data = await createInvite(serverId);
          setResult(data);
        } else {
          const users = await getKnownUsersForInvite(serverId);
          setKnownUsers(users);
        }
      }
    },
    [serverId, tab]
  );

  useEffect(() => {
    if (open && tab === "user") {
      getKnownUsersForInvite(serverId).then(setKnownUsers);
    }
  }, [open, tab, serverId]);

  const handleTabChange = useCallback(
    (newTab: Tab) => {
      setTab(newTab);
      setDirectInviteFeedback(null);
      if (newTab === "link" && open && !result) {
        createInvite(serverId).then(setResult);
      }
      if (newTab === "user" && open) {
        getKnownUsersForInvite(serverId).then(setKnownUsers);
      }
    },
    [open, result, serverId]
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

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      searchUsersByUsername(searchQuery, serverId).then((users) => {
        setSearchResults(users);
        setSearching(false);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, serverId]);

  const handleInviteUser = useCallback(
    async (user: InviteableUser) => {
      setDirectInviteFeedback(null);
      const res = await sendDirectInvite(serverId, user.id);
      if (res.success) {
        setDirectInviteFeedback({
          success: `Invite sent to @${user.username ?? "user"}`,
        });
        setKnownUsers((prev) => prev.filter((u) => u.id !== user.id));
        setSearchResults((prev) => prev.filter((u) => u.id !== user.id));
      } else {
        setDirectInviteFeedback({ error: res.error ?? "Failed to send invite" });
      }
    },
    [serverId]
  );

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
            Share a link or invite someone directly.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 border-b border-border pb-2">
          <Button
            variant={tab === "link" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleTabChange("link")}
            className="gap-1.5"
          >
            <Link2 className="h-4 w-4" />
            Invite by link
          </Button>
          <Button
            variant={tab === "user" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleTabChange("user")}
            className="gap-1.5"
          >
            <User className="h-4 w-4" />
            Invite by user
          </Button>
        </div>
        <div className="grid gap-4 py-4">
          {tab === "link" && (
            <>
              {result === null && (
                <p className="text-sm text-muted-foreground">
                  Creating invite…
                </p>
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
            </>
          )}
          {tab === "user" && (
            <>
              {directInviteFeedback && (
                <p
                  className={
                    "success" in directInviteFeedback
                      ? "text-sm text-green-600 dark:text-green-400"
                      : "text-sm text-destructive"
                  }
                >
                  {"success" in directInviteFeedback
                    ? directInviteFeedback.success
                    : directInviteFeedback.error}
                </p>
              )}
              <div className="space-y-2">
                <Input
                  placeholder="Search by username…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {searchQuery.trim().length >= 2 ? (
                  searching ? (
                    <p className="text-sm text-muted-foreground">
                      Searching…
                    </p>
                  ) : searchResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No users found.
                    </p>
                  ) : (
                    searchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleInviteUser(u)}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span className="font-medium">
                          @{u.username ?? "unknown"}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          Invite
                        </span>
                      </button>
                    ))
                  )
                ) : (
                  <>
                    <p className="text-xs font-medium text-muted-foreground">
                      People you know (from other servers)
                    </p>
                    {knownUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No one to invite yet. Search by username above.
                      </p>
                    ) : (
                      knownUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleInviteUser(u)}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span className="font-medium">
                            @{u.username ?? "unknown"}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            Invite
                          </span>
                        </button>
                      ))
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getPendingInvitesForUser,
  acceptDirectInvite,
  declineDirectInvite,
  type PendingInvite,
} from "@/app/actions/direct-invites";
import { getNotificationPreference } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";

export function InviteNotifications() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [preference, setPreference] = useState<"popup" | "badge_only" | "none">(
    "popup"
  );
  const preferenceRef = useRef(preference);
  preferenceRef.current = preference;
  const [loading, setLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    const data = await getPendingInvitesForUser();
    setInvites(data);
    return data;
  }, []);

  const fetchPreference = useCallback(async () => {
    const p = await getNotificationPreference();
    setPreference(p ?? "popup");
  }, []);

  useEffect(() => {
    Promise.all([fetchInvites(), fetchPreference()]).finally(() =>
      setLoading(false)
    );
  }, [fetchInvites, fetchPreference]);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const userId = user?.id;
      if (!userId) return;
      channel = supabase
        .channel("direct_invites")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "direct_invites",
            filter: `invited_user_id=eq.${userId}`,
          },
          async () => {
            await fetchInvites();
            if (preferenceRef.current === "popup") setOpen(true);
          }
        )
        .subscribe();
    });
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchInvites]);

  const handleAccept = async (inviteId: string) => {
    const res = await acceptDirectInvite(inviteId);
    if (res?.error) {
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    }
    queryClient.invalidateQueries({ queryKey: ["servers"] });
    setOpen(false);
    if (!res?.error) router.refresh();
  };

  const handleDecline = async (inviteId: string) => {
    await declineDirectInvite(inviteId);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  };

  const showBadge = preference !== "none" && invites.length > 0;
  const showDot = preference === "none" && invites.length > 0;

  if (preference === "none") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative text-muted-foreground hover:text-foreground"
        title="Notifications"
        asChild
      >
        <Link href="/notifications" className="flex items-center justify-center">
          <Bell className="h-5 w-5" />
          {showDot && (
            <span
              className="absolute right-0 top-0 h-2 w-2 rounded-full bg-destructive"
              aria-label={`${invites.length} pending`}
            />
          )}
        </Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {showBadge && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {invites.length > 9 ? "9+" : invites.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitations</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending invitations.
            </p>
          ) : (
            invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {inv.invited_by_username ? `@${inv.invited_by_username}` : "Someone"}{" "}
                    invited you to {inv.server_name}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecline(inv.id)}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(inv.id)}
                  >
                    Accept
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border pt-6">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="text-sm text-muted-foreground underline hover:no-underline"
          >
            View all notifications
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

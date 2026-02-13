"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  getPendingInvitesForUser,
  acceptDirectInvite,
  declineDirectInvite,
  type PendingInvite,
} from "@/app/actions/direct-invites";
import { Button } from "@/components/ui/button";

export function NotificationsList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    const data = await getPendingInvitesForUser();
    setInvites(data);
    return data;
  }, []);

  useEffect(() => {
    fetchInvites().finally(() => setLoading(false));
  }, [fetchInvites]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      const userId = user?.id;
      if (!userId) return;
      channel = supabase
        .channel("notifications_page")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "direct_invites",
            filter: `invited_user_id=eq.${userId}`,
          },
          () => fetchInvites()
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "direct_invites",
            filter: `invited_user_id=eq.${userId}`,
          },
          () => fetchInvites()
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
    if (!res?.error) router.refresh();
  };

  const handleDecline = async (inviteId: string) => {
    await declineDirectInvite(inviteId);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  };

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading notifications…</p>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="text-muted-foreground">
          No pending invitations. When someone invites you to a server, it will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        Server invitations
      </h2>
      <div className="space-y-2">
        {invites.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
          >
            <div>
              <p className="font-medium">
                {inv.invited_by_username ? `@${inv.invited_by_username}` : "Someone"}{" "}
                invited you to {inv.server_name}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDecline(inv.id)}
              >
                Decline
              </Button>
              <Button size="sm" onClick={() => handleAccept(inv.id)}>
                Accept
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

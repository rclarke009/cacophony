"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MemberRow } from "@/app/actions/members";
import {
  timeoutMember,
  kickMember,
  banMember,
  restoreInvitePermission,
  createBanRequest,
} from "@/app/actions/moderation";

interface MembersListProps {
  serverId: string;
  members: MemberRow[];
  currentUserId: string;
  isAdmin: boolean;
  isChannelModerator: boolean;
}

export function MembersList({
  serverId,
  members,
  currentUserId,
  isAdmin,
  isChannelModerator,
}: MembersListProps) {
  const [error, setError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const showActions = isAdmin || isChannelModerator;
  const isOwner = members.find((m) => m.user_id === currentUserId)?.role === "owner";

  async function handleTimeout(userId: string, minutes: number) {
    if (!isAdmin || userId === currentUserId) return;
    setActionTarget(userId);
    setError(null);
    const r = await timeoutMember(serverId, userId, minutes);
    setActionTarget(null);
    if ("error" in r) setError(r.error);
    else window.location.reload();
  }

  async function handleKick(userId: string) {
    if (userId === currentUserId) return;
    setActionTarget(userId);
    setError(null);
    const r = await kickMember(serverId, userId, null);
    setActionTarget(null);
    if ("error" in r) setError(r.error);
    else window.location.reload();
  }

  async function handleBan(userId: string) {
    if (!isAdmin || userId === currentUserId) return;
    setActionTarget(userId);
    setError(null);
    const r = await banMember(serverId, userId, null);
    setActionTarget(null);
    if ("error" in r) setError(r.error);
    else window.location.reload();
  }

  async function handleRestoreInvite(userId: string) {
    if (!isAdmin) return;
    setActionTarget(userId);
    setError(null);
    const r = await restoreInvitePermission(serverId, userId);
    setActionTarget(null);
    if ("error" in r) setError(r.error);
    else window.location.reload();
  }

  async function handleRequestBan(userId: string) {
    if (!isChannelModerator || userId === currentUserId) return;
    setActionTarget(userId);
    setError(null);
    const r = await createBanRequest(serverId, userId, null);
    setActionTarget(null);
    if ("error" in r) setError(r.error);
    else window.location.reload();
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Joined</th>
              <th className="px-3 py-2 font-medium">Invited by</th>
              <th className="px-3 py-2 font-medium">Bot invitees</th>
              {showActions && (
                <th className="px-3 py-2 font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isSelf = m.user_id === currentUserId;
              const invitedByCurrentUser = m.invited_by_user_id === currentUserId;
              const loading = actionTarget === m.user_id;
              const canAdminAct =
                isAdmin &&
                !isSelf &&
                m.role !== "owner" &&
                (m.role !== "admin" || isOwner);
              const canModeratorKick =
                isChannelModerator &&
                !isAdmin &&
                !isSelf &&
                invitedByCurrentUser &&
                m.role !== "owner" &&
                m.role !== "admin";
              const canRequestBan =
                isChannelModerator && !isAdmin && !isSelf;
              const showKick =
                (isAdmin && canAdminAct) || canModeratorKick;
              return (
                <tr key={m.user_id} className="border-b border-border">
                  <td className="px-3 py-2">
                    {m.username ?? "Unknown"}
                    {m.timeout_until &&
                      new Date(m.timeout_until) > new Date() && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (timed out)
                        </span>
                      )}
                  </td>
                  <td className="px-3 py-2">{m.role}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {m.inviter_username ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {m.bot_invitee_count > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        {m.bot_invitee_count}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  {showActions && (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {isAdmin && canAdminAct && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={loading}
                              onClick={() => handleTimeout(m.user_id, 5)}
                            >
                              5m
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={loading}
                              onClick={() => handleTimeout(m.user_id, 60)}
                            >
                              1h
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={loading}
                              onClick={() => handleBan(m.user_id)}
                            >
                              Ban
                            </Button>
                            {m.can_invite === false && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={loading}
                                onClick={() => handleRestoreInvite(m.user_id)}
                              >
                                Restore invite
                              </Button>
                            )}
                          </>
                        )}
                        {showKick && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loading}
                            onClick={() => handleKick(m.user_id)}
                          >
                            Kick
                          </Button>
                        )}
                        {canRequestBan && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loading}
                            onClick={() => handleRequestBan(m.user_id)}
                          >
                            Request ban
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

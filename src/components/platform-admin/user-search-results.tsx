"use client";

import { useState } from "react";
import {
  platformAdminKick,
  platformAdminBan,
  banFromAllServers,
} from "@/app/actions/platform-admin";
import type { UserSearchResult } from "@/app/actions/platform-admin";
import { Button } from "@/components/ui/button";

interface UserSearchResultsProps {
  users: UserSearchResult[];
  query: string;
}

export function UserSearchResults({ users, query }: UserSearchResultsProps) {
  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No users found for &quot;{query}&quot;.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {users.map((u) => (
        <UserRow key={u.user_id} user={u} />
      ))}
    </ul>
  );
}

function UserRow({ user }: { user: UserSearchResult }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleKick(serverId: string) {
    setBusy(true);
    setMessage(null);
    const r = await platformAdminKick(serverId, user.user_id, null);
    setBusy(false);
    if ("success" in r) setMessage({ type: "success", text: "Kicked." });
    else setMessage({ type: "error", text: r.error });
  }

  async function handleBan(serverId: string) {
    setBusy(true);
    setMessage(null);
    const r = await platformAdminBan(serverId, user.user_id, "Platform admin ban");
    setBusy(false);
    if ("success" in r) setMessage({ type: "success", text: "Banned from server." });
    else setMessage({ type: "error", text: r.error });
  }

  async function handleBanFromAll() {
    setBusy(true);
    setMessage(null);
    const r = await banFromAllServers(user.user_id, "Platform admin: ban from all servers");
    setBusy(false);
    if ("success" in r) setMessage({ type: "success", text: `Banned from ${r.banned_from} server(s).` });
    else setMessage({ type: "error", text: r.error });
  }

  const display = user.username ?? user.email ?? user.user_id.slice(0, 8);

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 font-medium text-foreground">{display}</div>
      {user.email && user.username !== user.email && (
        <div className="text-sm text-muted-foreground">{user.email}</div>
      )}
      <div className="mt-2 text-xs text-muted-foreground">ID: {user.user_id}</div>
      <div className="mt-3">
        <span className="text-sm font-medium text-foreground">Servers:</span>
        <ul className="mt-1 space-y-1">
          {user.servers.length === 0 ? (
            <li className="text-sm text-muted-foreground">Not in any server.</li>
          ) : (
            user.servers.map((s) => (
              <li key={s.server_id} className="flex items-center gap-2 text-sm">
                <span>
                  {s.server_name} ({s.role})
                  {s.invited_by_username && ` · invited by ${s.invited_by_username}`}
                </span>
                {s.role !== "owner" && (
                  <span className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => handleKick(s.server_id)}
                    >
                      Kick
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => handleBan(s.server_id)}
                    >
                      Ban
                    </Button>
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
      {user.servers.some((s) => s.role !== "owner") && (
        <div className="mt-3">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={handleBanFromAll}
          >
            Ban from all servers
          </Button>
        </div>
      )}
      {message && (
        <p
          className={`mt-2 text-sm ${message.type === "error" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message.text}
        </p>
      )}
    </li>
  );
}

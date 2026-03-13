"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BanRequestRow } from "@/app/actions/moderation";
import { resolveBanRequest } from "@/app/actions/moderation";

interface BanRequestsListProps {
  serverId: string;
  requests: BanRequestRow[];
}

export function BanRequestsList({ serverId, requests }: BanRequestsListProps) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResolve(requestId: string, action: "approve" | "dismiss") {
    setResolvingId(requestId);
    setError(null);
    const r = await resolveBanRequest(serverId, requestId, action);
    setResolvingId(null);
    if ("error" in r) setError(r.error);
    else window.location.reload();
  }

  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No ban requests.</p>
    );
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
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Requested by</th>
              <th className="px-3 py-2 font-medium">Target</th>
              <th className="px-3 py-2 font-medium">Reason</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-border">
                <td className="px-3 py-2 text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2">{r.requester_username ?? r.requested_by_user_id}</td>
                <td className="px-3 py-2">{r.target_username ?? r.target_user_id}</td>
                <td className="px-3 py-2">{r.reason ?? "—"}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">
                  {r.status === "pending" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={resolvingId === r.id}
                        onClick={() => handleResolve(r.id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={resolvingId === r.id}
                        onClick={() => handleResolve(r.id, "dismiss")}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

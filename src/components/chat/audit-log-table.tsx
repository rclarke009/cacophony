"use client";

import type { AuditLogEntry } from "@/app/actions/audit";

interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No audit log entries yet.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Actor</th>
            <th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Target</th>
            <th className="px-3 py-2 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-border">
              <td className="px-3 py-2 text-muted-foreground">
                {new Date(e.created_at).toLocaleString()}
              </td>
              <td className="px-3 py-2">
                {e.actor_username ?? e.actor_user_id ?? "—"}
              </td>
              <td className="px-3 py-2">{e.action}</td>
              <td className="px-3 py-2">
                {e.target_type} {e.target_id ? `(${e.target_id.slice(0, 8)}…)` : ""}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {e.details && Object.keys(e.details).length > 0
                  ? JSON.stringify(e.details)
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

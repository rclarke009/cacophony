"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateChannelSlowmode } from "@/app/actions/channels";

interface ChannelRow {
  id: string;
  name: string;
  type: string;
  slowmode_seconds: number | null;
}

interface ChannelsSlowmodeListProps {
  serverId: string;
  channels: ChannelRow[];
}

export function ChannelsSlowmodeList({
  serverId,
  channels,
}: ChannelsSlowmodeListProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      channels.map((c) => [c.id, String(c.slowmode_seconds ?? 0)])
    )
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(channelId: string) {
    const v = parseInt(values[channelId] ?? "0", 10);
    if (Number.isNaN(v) || v < 0) {
      setError("Enter a number ≥ 0");
      return;
    }
    setSavingId(channelId);
    setError(null);
    const r = await updateChannelSlowmode(serverId, channelId, v);
    setSavingId(null);
    if ("error" in r) setError(r.error);
    else window.location.reload();
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {channels.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-4 rounded-md border border-border p-3"
          >
            <span className="font-medium">{c.name}</span>
            <span className="text-sm text-muted-foreground">({c.type})</span>
            <div className="flex items-center gap-2">
              <label className="text-sm">Slowmode (sec)</label>
              <Input
                type="number"
                min={0}
                max={21600}
                className="w-20"
                value={values[c.id] ?? 0}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [c.id]: e.target.value }))
                }
              />
            </div>
            <Button
              size="sm"
              disabled={savingId === c.id}
              onClick={() => handleSave(c.id)}
            >
              Save
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

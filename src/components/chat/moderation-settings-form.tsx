"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ServerModerationSettings } from "@/app/actions/server-settings";

interface ModerationSettingsFormProps {
  serverId: string;
  initialSettings: ServerModerationSettings;
  saveAction: (
    serverId: string,
    settings: ServerModerationSettings
  ) => Promise<{ success: true } | { error: string }>;
}

export function ModerationSettingsForm({
  serverId,
  initialSettings,
  saveAction,
}: ModerationSettingsFormProps) {
  const [verificationLevel, setVerificationLevel] = useState(
    initialSettings.verification_level
  );
  const [explicitMediaFilter, setExplicitMediaFilter] = useState(
    initialSettings.explicit_media_filter
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const r = await saveAction(serverId, {
      verification_level: verificationLevel,
      explicit_media_filter: explicitMediaFilter,
    });
    if ("error" in r) setError(r.error);
    else setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm text-green-600 dark:text-green-400">Settings saved.</p>
      )}
      <div className="space-y-2">
        <Label htmlFor="verification_level">Verification level</Label>
        <select
          id="verification_level"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={verificationLevel}
          onChange={(e) => setVerificationLevel(e.target.value)}
        >
          <option value="none">None</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Requirements for new members before they can participate.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="explicit_media_filter">Explicit media filter</Label>
        <select
          id="explicit_media_filter"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={explicitMediaFilter}
          onChange={(e) => setExplicitMediaFilter(e.target.value)}
        >
          <option value="off">Off</option>
          <option value="warn">Warn</option>
          <option value="block">Block</option>
        </select>
        <p className="text-xs text-muted-foreground">
          How to handle explicit media in messages.
        </p>
      </div>
      <Button type="submit">Save</Button>
    </form>
  );
}

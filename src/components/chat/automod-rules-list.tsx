"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AutomodRuleRow } from "@/app/actions/automod";
import { deleteAutomodRule } from "@/app/actions/automod";

interface AutomodRulesListProps {
  serverId: string;
  rules: AutomodRuleRow[];
}

export function AutomodRulesList({ serverId, rules }: AutomodRulesListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(ruleId: string) {
    setDeletingId(ruleId);
    setError(null);
    const r = await deleteAutomodRule(ruleId, serverId);
    setDeletingId(null);
    if ("error" in r) setError(r.error);
    else window.location.reload();
  }

  if (rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No AutoMod rules yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className="flex items-center justify-between rounded-md border border-border p-3"
          >
            <div>
              <span className="font-medium">{rule.name}</span>
              <span className="ml-2 text-sm text-muted-foreground">
                {rule.type} → {rule.action}
              </span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={deletingId === rule.id}
              onClick={() => handleDelete(rule.id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

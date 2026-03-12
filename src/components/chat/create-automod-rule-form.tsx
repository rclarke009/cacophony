"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAutomodRule } from "@/app/actions/automod";

interface CreateAutomodRuleFormProps {
  serverId: string;
}

export function CreateAutomodRuleForm({ serverId }: CreateAutomodRuleFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("keywords");
  const [action, setAction] = useState("block");
  const [keywords, setKeywords] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const config =
      type === "keywords"
        ? { keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean) }
        : {};
    const r = await createAutomodRule(serverId, {
      name: name.trim() || "Unnamed rule",
      type,
      config,
      action,
    });
    if ("error" in r) setError(r.error);
    else {
      setName("");
      setKeywords("");
      window.location.reload();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-md border border-border p-4">
      <h3 className="font-medium">Add rule</h3>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. No spam links"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="spam">Spam</option>
          <option value="harmful_links">Harmful links</option>
          <option value="profanity">Profanity</option>
          <option value="keywords">Keywords</option>
        </select>
      </div>
      {type === "keywords" && (
        <div className="space-y-2">
          <Label htmlFor="keywords">Keywords (comma-separated)</Label>
          <Input
            id="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="word1, word2"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="action">Action</Label>
        <select
          id="action"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="block">Block</option>
          <option value="quarantine">Quarantine</option>
          <option value="flag">Flag</option>
        </select>
      </div>
      <Button type="submit">Add rule</Button>
    </form>
  );
}

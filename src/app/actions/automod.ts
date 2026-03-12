"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validation";

export type AutomodRuleRow = {
  id: string;
  server_id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  action: string;
  created_at: string;
};

export async function getAutomodRules(
  serverId: string
): Promise<{ rules: AutomodRuleRow[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rules: [], error: "Not authenticated" };
  if (!isValidUUID(serverId)) return { rules: [], error: "Invalid server" };

  const { data, error } = await supabase
    .from("automod_rules")
    .select("id, server_id, name, type, config, action, created_at")
    .eq("server_id", serverId)
    .order("created_at", { ascending: true });

  if (error) {
    console.log("MYDEBUG →", error);
    return { rules: [], error: error.message };
  }
  return { rules: (data ?? []) as AutomodRuleRow[] };
}

export async function createAutomodRule(
  serverId: string,
  input: { name: string; type: string; config: Record<string, unknown>; action: string }
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data: membership } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    return { error: "Only server owners and admins can create AutoMod rules" };
  }
  const { error } = await supabase.from("automod_rules").insert({
    server_id: serverId,
    name: input.name,
    type: input.type,
    config: input.config,
    action: input.action,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteAutomodRule(
  ruleId: string,
  serverId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data: membership } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    return { error: "Only server owners and admins can delete AutoMod rules" };
  }
  const { error } = await supabase
    .from("automod_rules")
    .delete()
    .eq("id", ruleId)
    .eq("server_id", serverId);
  if (error) return { error: error.message };
  return { success: true };
}

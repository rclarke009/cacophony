"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validation";

export type AuditLogEntry = {
  id: string;
  server_id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  actor_username?: string | null;
};

export async function getAuditLog(
  serverId: string,
  limit = 50
): Promise<{ entries: AuditLogEntry[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { entries: [], error: "Not authenticated" };
  if (!isValidUUID(serverId)) return { entries: [], error: "Invalid server" };

  const { data: membership } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    return { entries: [], error: "Only server owners and admins can view the audit log" };
  }

  const { data, error } = await supabase
    .from("audit_log")
    .select("id, server_id, actor_user_id, action, target_type, target_id, details, created_at")
    .eq("server_id", serverId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.log("MYDEBUG →", error);
    return { entries: [], error: error.message };
  }

  const actorIds = [...new Set((data ?? []).map((e) => e.actor_user_id).filter(Boolean))] as string[];
  const { data: profiles } =
    actorIds.length > 0
      ? await supabase.from("profiles").select("id, username").in("id", actorIds)
      : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));

  const entries: AuditLogEntry[] = (data ?? []).map((e) => ({
    ...e,
    details: (e.details as Record<string, unknown>) ?? null,
    actor_username: e.actor_user_id ? profileMap.get(e.actor_user_id) ?? null : null,
  }));

  return { entries };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/validation";

export type ReportRow = {
  id: string;
  server_id: string;
  reporter_user_id: string;
  reported_user_id: string | null;
  reported_message_id: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  reporter_username: string | null;
  reported_username: string | null;
};

export async function getReportsForServer(
  serverId: string
): Promise<{ reports: ReportRow[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { reports: [], error: "Not authenticated" };
  const { data: membership } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    return { reports: [], error: "Only moderators can view reports" };
  }

  const { data, error } = await supabase
    .from("reports")
    .select("id, server_id, reporter_user_id, reported_user_id, reported_message_id, reason, status, created_at")
    .eq("server_id", serverId)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("MYDEBUG →", error);
    return { reports: [], error: error.message };
  }

  const userIds = new Set<string>();
  (data ?? []).forEach((r) => {
    userIds.add(r.reporter_user_id);
    if (r.reported_user_id) userIds.add(r.reported_user_id);
  });
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", [...userIds]);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));

  const reports: ReportRow[] = (data ?? []).map((r) => ({
    ...r,
    reporter_username: profileMap.get(r.reporter_user_id) ?? null,
    reported_username: r.reported_user_id
      ? profileMap.get(r.reported_user_id) ?? null
      : null,
  }));

  return { reports };
}

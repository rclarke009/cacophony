import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuditLog } from "@/app/actions/audit";
import { AuditLogTable } from "@/components/chat/audit-log-table";

interface PageProps {
  params: Promise<{ serverId: string }>;
}

export default async function AuditLogPage({ params }: PageProps) {
  const { serverId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: membership } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    notFound();
  }

  const { entries, error } = await getAuditLog(serverId);
  if (error) notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Audit log</h2>
      <p className="text-sm text-muted-foreground">
        Recent moderation and server actions.
      </p>
      <AuditLogTable entries={entries} />
    </div>
  );
}

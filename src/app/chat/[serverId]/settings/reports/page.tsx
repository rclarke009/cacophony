import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getReportsForServer } from "@/app/actions/reports";
import { ReportsList } from "@/components/chat/reports-list";

interface PageProps {
  params: Promise<{ serverId: string }>;
}

export default async function ReportsPage({ params }: PageProps) {
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

  const { reports, error } = await getReportsForServer(serverId);
  if (error) notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Reports</h2>
      <p className="text-sm text-muted-foreground">
        User-reported messages and members. Resolve or dismiss.
      </p>
      <ReportsList serverId={serverId} reports={reports} />
    </div>
  );
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBanRequestsForServer } from "@/app/actions/moderation";
import { BanRequestsList } from "@/components/chat/ban-requests-list";

interface PageProps {
  params: Promise<{ serverId: string }>;
}

export default async function BanRequestsPage({ params }: PageProps) {
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

  const { requests, error } = await getBanRequestsForServer(serverId);
  if (error) notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Ban requests</h2>
      <p className="text-sm text-muted-foreground">
        Channel moderators can suggest that a user be banned from the server. Approve to ban, or dismiss.
      </p>
      <BanRequestsList serverId={serverId} requests={requests} />
    </div>
  );
}

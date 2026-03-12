import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChannelsSlowmodeList } from "@/components/chat/channels-slowmode-list";

interface PageProps {
  params: Promise<{ serverId: string }>;
}

export default async function ChannelsSettingsPage({ params }: PageProps) {
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

  const { data: channels } = await supabase
    .from("channels")
    .select("id, name, type, slowmode_seconds")
    .eq("server_id", serverId)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Channels</h2>
      <p className="text-sm text-muted-foreground">
        Set slowmode (seconds between messages per user) per channel.
      </p>
      <ChannelsSlowmodeList serverId={serverId} channels={channels ?? []} />
    </div>
  );
}

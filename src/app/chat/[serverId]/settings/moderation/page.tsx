import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getServerModerationSettings,
  upsertServerModerationSettings,
} from "@/app/actions/server-settings";
import { ModerationSettingsForm } from "@/components/chat/moderation-settings-form";

interface PageProps {
  params: Promise<{ serverId: string }>;
}

export default async function ModerationSettingsPage({ params }: PageProps) {
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

  const { settings, error } = await getServerModerationSettings(serverId);
  if (error) notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Moderation & safety</h2>
      <ModerationSettingsForm
        serverId={serverId}
        initialSettings={{
          verification_level: settings?.verification_level ?? "none",
          explicit_media_filter: settings?.explicit_media_filter ?? "off",
        }}
        saveAction={upsertServerModerationSettings}
      />
    </div>
  );
}

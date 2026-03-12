import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAutomodRules, deleteAutomodRule } from "@/app/actions/automod";
import { AutomodRulesList } from "@/components/chat/automod-rules-list";
import { CreateAutomodRuleForm } from "@/components/chat/create-automod-rule-form";

interface PageProps {
  params: Promise<{ serverId: string }>;
}

export default async function AutomodPage({ params }: PageProps) {
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

  const { rules, error } = await getAutomodRules(serverId);
  if (error) notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">AutoMod rules</h2>
      <p className="text-sm text-muted-foreground">
        Automatically block, quarantine, or flag messages matching rules.
      </p>
      <CreateAutomodRuleForm serverId={serverId} />
      <AutomodRulesList serverId={serverId} rules={rules} />
    </div>
  );
}

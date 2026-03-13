import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getServerMembersWithInviteInfo } from "@/app/actions/members";
import { isChannelModerator } from "@/app/actions/moderation";
import { MembersList } from "@/components/chat/members-list";

interface PageProps {
  params: Promise<{ serverId: string }>;
}

export default async function MembersPage({ params }: PageProps) {
  const { serverId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  const { members, error } = await getServerMembersWithInviteInfo(serverId);
  if (error) notFound();

  const isAdmin =
    membership.role === "owner" || membership.role === "admin";
  const isChannelMod = await isChannelModerator(serverId, user.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <h1 className="font-semibold text-foreground">Members</h1>
        {isAdmin && (
          <Link
            href={`/chat/${serverId}/invite-tree`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Invite tree
          </Link>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <MembersList
          serverId={serverId}
          members={members}
          currentUserId={user.id}
          isAdmin={isAdmin}
          isChannelModerator={isChannelMod}
        />
      </div>
    </div>
  );
}

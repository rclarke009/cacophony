import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getInviteTree } from "@/app/actions/members";
import { InviteTreeView } from "@/components/chat/invite-tree-view";

interface PageProps {
  params: Promise<{ serverId: string }>;
}

export default async function InviteTreePage({ params }: PageProps) {
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

  const { tree, error } = await getInviteTree(serverId);
  if (error) notFound();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <h1 className="font-semibold text-foreground">Invite tree</h1>
        <Link
          href={`/chat/${serverId}/members`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Members
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <InviteTreeView tree={tree} />
      </div>
    </div>
  );
}

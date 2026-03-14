import Link from "next/link";
import { notFound } from "next/navigation";
import { getInviteTreeForAdmin } from "@/app/actions/platform-admin";
import { InviteTreeView } from "@/components/chat/invite-tree-view";

interface PageProps {
  params: Promise<{ serverId: string }>;
}

export default async function PlatformAdminServerTreePage({ params }: PageProps) {
  const { serverId } = await params;
  const { tree, error } = await getInviteTreeForAdmin(serverId);

  if (error) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/platform-admin"
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          Platform admin
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-foreground">Invite tree</h1>
      <p className="text-sm text-muted-foreground">
        Server ID: {serverId}
      </p>
      <div className="rounded-lg border border-border bg-card p-4">
        <InviteTreeView tree={tree} />
      </div>
    </div>
  );
}

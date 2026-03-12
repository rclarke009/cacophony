import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Shield, Bot, ScrollText, MessageSquare, Flag } from "lucide-react";

export default async function ServerSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ serverId: string }>;
}) {
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
  const isAdmin = membership.role === "owner" || membership.role === "admin";
  if (!isAdmin) notFound();

  const base = `/chat/${serverId}/settings`;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
      <div className="flex h-12 items-center border-b border-border px-4">
        <h1 className="font-semibold text-foreground">Server settings</h1>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="w-48 shrink-0 border-r border-border p-2">
          <nav className="flex flex-col gap-0.5">
            <Link
              href={`${base}/moderation`}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Shield className="h-4 w-4" />
              Moderation
            </Link>
            <Link
              href={`${base}/automod`}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Bot className="h-4 w-4" />
              AutoMod
            </Link>
            <Link
              href={`${base}/audit`}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ScrollText className="h-4 w-4" />
              Audit log
            </Link>
            <Link
              href={`${base}/reports`}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Flag className="h-4 w-4" />
              Reports
            </Link>
            <Link
              href={`${base}/channels`}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              Channels
            </Link>
          </nav>
        </aside>
        <main className="min-h-0 flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
}

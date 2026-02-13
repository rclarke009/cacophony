import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateChannelDialog } from "@/components/chat/create-channel-dialog";
import { ThemeSelector } from "@/components/theme-selector";
import { MessageSquare } from "lucide-react";

export default async function ServerLayout({
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

  if (!user) {
    redirect("/login");
  }

  const { data: server, error } = await supabase
    .from("servers")
    .select("id, name, channels(id, name, type)")
    .eq("id", serverId)
    .single();

  if (error || !server) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();

  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const channels = (server.channels ?? []) as { id: string; name: string; type: string }[];

  return (
    <>
      <aside className="flex w-56 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-12 items-center border-b border-sidebar-border px-4">
          <h2 className="font-semibold text-sidebar-foreground">{server.name}</h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/chat/${serverId}/${channel.id}`}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              {channel.name}
            </Link>
          ))}
          {isAdmin && (
            <div className="px-2 pt-2">
              <CreateChannelDialog serverId={serverId} />
            </div>
          )}
        </nav>
        <div className="border-t border-sidebar-border p-2">
          <ThemeSelector />
        </div>
      </aside>
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </>
  );
}

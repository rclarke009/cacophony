import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { CreateServerDialog } from "@/components/chat/create-server-dialog";
import { Button } from "@/components/ui/button";
import { Home, LogOut, Settings } from "lucide-react";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("server_members")
    .select(
      `
      server_id,
      servers (
        id,
        name,
        icon_url,
        icon_emoji,
        channels (
          id,
          name,
          type
        )
      )
    `
    )
    .eq("user_id", user.id);

  type ServerWithChannels = {
    id: string;
    name: string;
    icon_url: string | null;
    icon_emoji: string | null;
    channels: { id: string; name: string; type: string }[];
  };
  const servers = (memberships
    ?.map((m) => m.servers as unknown as ServerWithChannels | null)
    .filter(Boolean) ?? []) as ServerWithChannels[];

  return (
    <div className="flex h-screen bg-background">
      <aside className="flex w-14 flex-col items-center gap-2 border-r border-sidebar-border bg-sidebar py-3">
        {servers?.map((server) => (
          <Link
            key={server.id}
            href={`/chat/${server.id}/${server.channels?.[0]?.id ?? ""}`}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground transition-colors hover:rounded-xl hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            title={server.name}
          >
            {server.icon_emoji ? (
              <span className="text-2xl" aria-hidden>
                {server.icon_emoji}
              </span>
            ) : server.icon_url ? (
              <img
                src={server.icon_url}
                alt={server.name}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <Home className="h-6 w-6" />
            )}
          </Link>
        ))}
        <CreateServerDialog />
        <div className="mt-auto flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            title="Settings"
            asChild
          >
            <Link href="/settings">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              title="Log out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

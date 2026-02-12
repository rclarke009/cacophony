import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Home, LogOut } from "lucide-react";

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
    channels: { id: string; name: string; type: string }[];
  };
  const servers = (memberships
    ?.map((m) => m.servers as unknown as ServerWithChannels | null)
    .filter(Boolean) ?? []) as ServerWithChannels[];

  return (
    <div className="flex h-screen bg-zinc-950">
      <aside className="flex w-14 flex-col items-center gap-2 border-r border-zinc-800 bg-zinc-900/50 py-3">
        {servers?.map((server) => (
          <Link
            key={server.id}
            href={`/chat/${server.id}/${server.channels?.[0]?.id ?? ""}`}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 transition-colors hover:rounded-xl hover:bg-primary hover:text-primary-foreground"
            title={server.name}
          >
            {server.icon_url ? (
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
        <div className="mt-auto">
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-zinc-100"
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

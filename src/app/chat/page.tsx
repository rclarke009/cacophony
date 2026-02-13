import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WelcomeEmptyState } from "@/components/chat/welcome-empty-state";

export default async function ChatPage() {
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
        channels (
          id,
          name
        )
      )
    `
    )
    .eq("user_id", user.id);

  const firstServer = memberships?.[0]?.servers as unknown as
    | { id: string; name: string; channels: { id: string; name: string }[] }
    | null;
  const firstChannel = firstServer?.channels?.[0];

  if (firstServer && firstChannel) {
    redirect(`/chat/${firstServer.id}/${firstChannel.id}`);
  }

  return <WelcomeEmptyState />;
}

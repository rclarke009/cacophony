import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: PageProps) {
  const { code } = await params;

  if (!code?.trim()) {
    redirect("/chat");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/signup?invite=${encodeURIComponent(code.trim())}`);
  }

  const admin = createAdminClient();
  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("id, code, max_uses, uses, expires_at, server_id")
    .eq("code", code.trim())
    .single();

  if (inviteError || !invite) {
    redirect("/chat?error=invalid_invite");
  }

  if (invite.uses >= invite.max_uses) {
    redirect("/chat?error=invite_used");
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    redirect("/chat?error=invite_expired");
  }

  if (!invite.server_id) {
    redirect(`/signup?invite=${encodeURIComponent(code.trim())}`);
  }

  const { data: existing } = await admin
    .from("server_members")
    .select("id")
    .eq("server_id", invite.server_id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    await admin.from("server_members").insert({
      server_id: invite.server_id,
      user_id: user.id,
      role: "member",
    });
    await admin
      .from("invites")
      .update({
        used_by_user_id: user.id,
        used_at: new Date().toISOString(),
        uses: invite.uses + 1,
      })
      .eq("id", invite.id);
  }

  const { data: channels } = await admin
    .from("channels")
    .select("id")
    .eq("server_id", invite.server_id)
    .order("created_at", { ascending: true })
    .limit(1);

  const firstChannelId = channels?.[0]?.id;
  if (firstChannelId) {
    redirect(`/chat/${invite.server_id}/${firstChannelId}`);
  }

  redirect("/chat");
}

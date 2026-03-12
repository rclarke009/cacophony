import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ serverId: string }>;
}

export default async function ServerSettingsPage({ params }: PageProps) {
  const { serverId } = await params;
  redirect(`/chat/${serverId}/settings/moderation`);
}

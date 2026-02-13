import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { NotificationsList } from "@/components/chat/notifications-list";
import { ArrowLeft } from "lucide-react";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link
              href="/chat"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Notifications</h1>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <NotificationsList />
        </div>
      </main>
    </div>
  );
}

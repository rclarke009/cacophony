import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/theme-selector";
import { SettingsAccountSection } from "@/components/settings/account-section";
import { SettingsAppearanceSection } from "@/components/settings/appearance-section";
import { SettingsNotificationsSection } from "@/components/settings/notifications-section";
import { SettingsSecuritySection } from "@/components/settings/security-section";
import { ArrowLeft } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, theme_preference, notification_preference")
    .eq("id", user.id)
    .single();

  const themePreference =
    profile?.theme_preference === "retro" ? "retro" : "dark";
  const notificationPreference =
    profile?.notification_preference === "popup" ||
    profile?.notification_preference === "badge_only" ||
    profile?.notification_preference === "none"
      ? profile.notification_preference
      : "popup";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/chat" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
        <ThemeSelector />
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <SettingsAccountSection
            email={user.email ?? ""}
            username={profile?.username ?? ""}
          />
          <SettingsAppearanceSection initialTheme={themePreference} />
          <SettingsNotificationsSection
            initialPreference={notificationPreference}
          />
          <SettingsSecuritySection />
        </div>
      </main>
    </div>
  );
}

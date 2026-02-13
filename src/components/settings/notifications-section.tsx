"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateNotificationPreference } from "@/app/actions/profile";
import Link from "next/link";

export type NotificationPreference = "popup" | "badge_only" | "none";

interface SettingsNotificationsSectionProps {
  initialPreference: NotificationPreference;
}

const OPTIONS: { value: NotificationPreference; label: string; desc: string }[] =
  [
    {
      value: "popup",
      label: "Pop-up notifications",
      desc: "Show a pop-up when you receive an invite, plus a badge on the bell.",
    },
    {
      value: "badge_only",
      label: "Badge only",
      desc: "No pop-ups. Only a badge count on the bell when you have invites.",
    },
    {
      value: "none",
      label: "No notifications",
      desc: "No pop-ups or badge. Check the notifications center when you want to see invites.",
    },
  ];

export function SettingsNotificationsSection({
  initialPreference,
}: SettingsNotificationsSectionProps) {
  const [state, formAction] = useActionState(updateNotificationPreference, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choose how you want to be notified about server invites and other
          updates.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state?.error && (
            <p className="text-sm text-red-500" role="alert">
              {state.error}
            </p>
          )}
          {state?.success && (
            <p
              className="text-sm text-green-600 dark:text-green-400"
              role="status"
            >
              {state.success}
            </p>
          )}
          <div className="space-y-3">
            {OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-accent/50"
              >
                <input
                  type="radio"
                  name="notification_preference"
                  value={opt.value}
                  defaultChecked={initialPreference === opt.value}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            <Link href="/notifications" className="underline hover:no-underline">
              View notifications center
            </Link>{" "}
            to check invites and other updates anytime.
          </p>
        </CardContent>
        <CardFooter>
          <Button type="submit">Save preference</Button>
        </CardFooter>
      </form>
    </Card>
  );
}

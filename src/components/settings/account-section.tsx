"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateProfile } from "@/app/actions/profile";
import { updateEmail } from "@/app/actions/auth";

interface SettingsAccountSectionProps {
  email: string;
  username: string;
}

export function SettingsAccountSection({ email, username }: SettingsAccountSectionProps) {
  const [profileState, profileAction] = useActionState(updateProfile, null);
  const [emailState, emailAction] = useActionState(updateEmail, null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Username</CardTitle>
          <CardDescription>
            Your display name in chat. Must be at least 3 characters.
          </CardDescription>
        </CardHeader>
        <form action={profileAction}>
          <CardContent className="space-y-4">
            {profileState?.error && (
              <p className="text-sm text-red-500" role="alert">
                {profileState.error}
              </p>
            )}
            {profileState?.success && (
              <p className="text-sm text-green-600 dark:text-green-400" role="status">
                {profileState.success}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                defaultValue={username}
                placeholder="Your username"
                autoComplete="username"
                minLength={3}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit">Save username</Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            Change your email address. You&apos;ll receive a confirmation link at the new address.
          </CardDescription>
        </CardHeader>
        <form action={emailAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-email">Current email</Label>
              <Input
                id="current-email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
            </div>
            {emailState?.error && (
              <p className="text-sm text-red-500" role="alert">
                {emailState.error}
              </p>
            )}
            {emailState?.success && (
              <p className="text-sm text-green-600 dark:text-green-400" role="status">
                {emailState.success}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-email">New email</Label>
              <Input
                id="new-email"
                name="email"
                type="email"
                placeholder="new@example.com"
                autoComplete="email"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit">Change email</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

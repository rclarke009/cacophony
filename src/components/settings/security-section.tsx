"use client";

import Link from "next/link";
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
import { updatePasswordFromSettings } from "@/app/actions/auth";

export function SettingsSecuritySection() {
  const [state, formAction] = useActionState(updatePasswordFromSettings, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Change your password. You&apos;ll stay logged in after updating.
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
            <p className="text-sm text-green-600 dark:text-green-400" role="status">
              {state.success}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Forgot your current password?{" "}
            <Link href="/forgot-password" className="underline hover:text-foreground">
              Request a reset link
            </Link>
          </p>
        </CardContent>
        <CardFooter>
          <Button type="submit">Update password</Button>
        </CardFooter>
      </form>
    </Card>
  );
}

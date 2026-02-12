"use client";

import Link from "next/link";
import { Suspense, useActionState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
import { signUp } from "@/app/actions/auth";

function SignupForm() {
  const [state, formAction] = useActionState(signUp, null);
  const searchParams = useSearchParams();
  const inviteFromUrl = useMemo(
    () => searchParams.get("invite")?.trim() ?? "",
    [searchParams]
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>
            Create an account to join Cacophany. An invite code is required.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            {state?.error && (
              <div
                className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                role="alert"
              >
                {state.error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite_code">Invite code</Label>
              <Input
                id="invite_code"
                name="invite_code"
                type="text"
                placeholder="e.g. cacophany-welcome"
                autoComplete="off"
                defaultValue={inviteFromUrl}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username (optional)</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="display name"
                autoComplete="username"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full">
              Sign up
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                Log in
              </Link>
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">← Back</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-8">
          <Card className="w-full max-w-md">
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}

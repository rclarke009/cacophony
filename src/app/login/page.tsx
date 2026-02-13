"use client";

import Link from "next/link";
import { useActionState, Suspense } from "react";
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
import { signIn } from "@/app/actions/auth";
import { ThemeSelector } from "@/components/theme-selector";

function LoginForm() {
  const [state, formAction] = useActionState(signIn, null);
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="absolute right-4 top-4">
        <ThemeSelector />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>
            Enter your email and password to continue
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            {resetSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400" role="status">
                Password updated. You can log in with your new password.
              </p>
            )}
            {state?.error && (
              <p className="text-sm text-red-500" role="alert">
                {state.error}
              </p>
            )}
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
                autoComplete="current-password"
              />
              <p className="text-right text-xs">
                <Link href="/forgot-password" className="text-muted-foreground hover:underline">
                  Forgot password?
                </Link>
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full">
              Log in
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
                Sign up
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

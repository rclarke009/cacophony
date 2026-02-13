"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, Suspense } from "react";
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
import { updatePassword } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, null);
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  useEffect(() => {
    const supabase = createClient();
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const hasRecovery = hash.includes("type=recovery");

    const finish = (session: { user: unknown } | null) => {
      if (session?.user) {
        setReady(true);
        if (typeof window !== "undefined" && code) {
          window.history.replaceState({}, "", "/reset-password");
        }
        return;
      }
      if (hasRecovery) {
        let attempts = 0;
        const maxAttempts = 25;
        const check = () => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s?.user) setReady(true);
            else if (attempts >= maxAttempts) setInvalidLink(true);
            else {
              attempts += 1;
              setTimeout(check, 200);
            }
          });
        };
        check();
      } else {
        setInvalidLink(true);
      }
    };

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data: { session }, error }) => {
        if (error) console.error("MYDEBUG →", error);
        finish(session);
      });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => finish(session));
    }
  }, [code]);

  if (!ready && !invalidLink) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-8">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Checking your link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invalidLink) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Invalid or expired link</CardTitle>
            <CardDescription>
              This reset link is invalid or has expired. Request a new one from the forgot password page.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/forgot-password">Request new link</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set new password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            {state?.error && (
              <p className="text-sm text-red-500" role="alert">
                {state.error}
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
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Update password
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordForm />
    </Suspense>
  );
}

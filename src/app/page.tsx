import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-8">
      <h1 className="mb-2 text-4xl font-bold text-zinc-50">Cacophany</h1>
      <p className="mb-8 text-zinc-400">
        Invite-only chat for friends
      </p>
      {user ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-zinc-200">
            Welcome, {user.email}
          </p>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

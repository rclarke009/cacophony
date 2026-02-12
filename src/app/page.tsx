import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-8">
      <h1 className="mb-2 text-4xl font-bold text-zinc-50">Cacophany</h1>
      <p className="mb-8 text-zinc-400">
        Invite-only chat for friends
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/login">Log in</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/signup">Sign up</Link>
        </Button>
      </div>
    </div>
  );
}

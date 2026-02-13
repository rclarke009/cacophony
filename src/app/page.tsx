import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/theme-selector";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="absolute right-4 top-4">
        <ThemeSelector />
      </div>
      <h1 className="mb-2 text-4xl font-bold text-foreground">Cacophany</h1>
      <p className="mb-8 text-muted-foreground">
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

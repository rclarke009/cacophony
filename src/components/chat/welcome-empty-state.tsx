import { CreateServerDialog } from "./create-server-dialog";
import { Button } from "@/components/ui/button";

export function WelcomeEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="max-w-md space-y-6 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Welcome to Cacophany
        </h2>
        <p className="text-sm text-muted-foreground">
          You&apos;re in. To join a server, you need an invite link from someone
          who&apos;s already in it. Or create your own server to get started.
        </p>
        <CreateServerDialog
          trigger={
            <Button size="lg">Create your own server</Button>
          }
        />
      </div>
    </div>
  );
}

export function WelcomeEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <h2 className="text-xl font-semibold text-zinc-100">
          Welcome to Cacophany
        </h2>
        <p className="text-sm text-zinc-400">
          You&apos;re in. To join conversations, you need an invite link from
          someone who&apos;s already in that conversation. Ask a friend to
          share their invite link with you.
        </p>
      </div>
    </div>
  );
}

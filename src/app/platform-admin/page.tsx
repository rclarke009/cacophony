import Link from "next/link";
import { getServersForAdmin, searchUserForAdmin } from "@/app/actions/platform-admin";
import { UserSearchResults } from "@/components/platform-admin/user-search-results";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function PlatformAdminPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const { servers } = await getServersForAdmin();
  const { users } = q?.trim() ? await searchUserForAdmin(q.trim()) : { users: [] };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-foreground">Platform admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View invite trees and boot abusive users. Access is limited to main admins (see below).
        </p>
        <Link
          href="/chat"
          className="mt-2 inline-block text-sm text-muted-foreground underline hover:text-foreground"
        >
          Back to chat
        </Link>
      </header>

      <section className="rounded-lg border border-border bg-muted/30 p-4">
        <h2 className="mb-2 text-lg font-medium text-foreground">How to access this area</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Only users listed in <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">PLATFORM_ADMIN_USER_IDS</code> can open this page. If you are the main admin (you control the DB):
        </p>
        <ol className="mb-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Get your user UUID from Supabase Dashboard → Authentication → Users (copy your user&apos;s ID).</li>
          <li>In your deployment or <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env.local</code>, set <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">PLATFORM_ADMIN_USER_IDS=your-uuid</code> (comma-separated for multiple admins).</li>
          <li>Restart the app if needed, then open <strong className="text-foreground">/platform-admin</strong> in your browser (e.g. https://yourapp.com/platform-admin or http://localhost:3000/platform-admin).</li>
        </ol>
        <p className="text-sm text-muted-foreground">
          If that env var is missing or your ID isn’t in it, visiting /platform-admin will redirect you to chat.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-muted/30 p-4">
        <h2 className="mb-2 text-lg font-medium text-foreground">How to use this area</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Servers</strong> — Click a server name to see its <strong className="text-foreground">invite tree</strong> (who invited whom). Use this to trace abuse or see who brought in a user.</li>
          <li><strong className="text-foreground">User lookup</strong> — Search by username or email. Results show which servers the user is in, their role, and who invited them. From there you can <strong className="text-foreground">Kick</strong> or <strong className="text-foreground">Ban</strong> from a single server, or <strong className="text-foreground">Ban from all servers</strong> for serious abuse.</li>
          <li>Kick = remove from the server (they can rejoin with a new invite). Ban = remove and block from rejoining that server. &quot;Ban from all&quot; applies a ban on every server they’re in (except where they’re owner).</li>
          <li>All actions are written to the server <strong className="text-foreground">audit log</strong> (per server) so you can review what was done.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-foreground">Servers</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          View invite tree for any server.
        </p>
        <ul className="space-y-1">
          {servers.length === 0 ? (
            <li className="text-sm text-muted-foreground">No servers.</li>
          ) : (
            servers.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/platform-admin/servers/${s.id}`}
                  className="text-primary underline hover:no-underline"
                >
                  {s.name}
                </Link>
                {s.owner_username && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    (owner: {s.owner_username})
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-foreground">User lookup</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Search by username or email (min 2 characters).
        </p>
        <form method="get" action="/platform-admin" className="mb-4 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Username or email"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            minLength={2}
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Search
          </button>
        </form>
        {q?.trim() && <UserSearchResults users={users} query={q.trim()} />}
      </section>
    </div>
  );
}

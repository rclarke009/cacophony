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
          View invite trees and boot abusive users. Access is limited to PLATFORM_ADMIN_USER_IDS.
        </p>
        <Link
          href="/chat"
          className="mt-2 inline-block text-sm text-muted-foreground underline hover:text-foreground"
        >
          Back to chat
        </Link>
      </header>

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

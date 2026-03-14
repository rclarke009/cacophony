/**
 * Platform admin: main admin(s) who control the DB. Identified by env PLATFORM_ADMIN_USER_IDS (comma-separated UUIDs).
 * Used to protect /platform-admin routes and allow boot/kick/ban across any server.
 */

function getPlatformAdminUserIds(): Set<string> {
  const raw = process.env.PLATFORM_ADMIN_USER_IDS;
  if (!raw?.trim()) return new Set();
  const ids = raw
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  return new Set(ids);
}

let cachedIds: Set<string> | null = null;

/** Returns the set of user IDs that are platform admins. */
export function getPlatformAdminIds(): Set<string> {
  if (cachedIds === null) cachedIds = getPlatformAdminUserIds();
  return cachedIds;
}

/** Returns true if the given user ID is a platform admin. */
export function isPlatformAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return getPlatformAdminIds().has(userId.trim().toLowerCase());
}

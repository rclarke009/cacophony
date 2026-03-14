# Platform admin scripts

These scripts use the **Supabase service role** to list servers, members, invite trees, and to kick/ban users. They are for the main admin who controls the DB.

**Required env:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.  
For boot scripts you also need `BOOT_ACTOR_USER_ID` (your user UUID) for audit_log.

Load env from `.env.local` when running locally, e.g.:

```bash
export $(grep -v '^#' .env.local | xargs)
node scripts/admin-list-servers.mjs
```

## Scripts

| Script | Purpose |
|--------|---------|
| `admin-list-servers.mjs` | List all servers and their owners |
| `admin-list-members.mjs <SERVER_ID>` | List members of a server (role, inviter) |
| `admin-invite-tree.mjs <SERVER_ID>` | Print invite tree (who invited whom) |
| `admin-boot.mjs <SERVER_ID> <USER_ID> kick \| ban [reason]` | Kick or ban a user from one server |
| `admin-ban-all.mjs <USER_ID> [reason]` | Ban user from all servers they belong to (except where owner) |

## Examples

```bash
# List servers
node scripts/admin-list-servers.mjs

# List members of a server
node scripts/admin-list-members.mjs <SERVER_UUID>

# Show invite tree
node scripts/admin-invite-tree.mjs <SERVER_UUID>

# Kick user from server (set BOOT_ACTOR_USER_ID)
BOOT_ACTOR_USER_ID=<your-uuid> node scripts/admin-boot.mjs <SERVER_UUID> <USER_UUID> kick

# Ban user from server
BOOT_ACTOR_USER_ID=<your-uuid> node scripts/admin-boot.mjs <SERVER_UUID> <USER_UUID> ban "Abuse"

# Ban user from all servers
BOOT_ACTOR_USER_ID=<your-uuid> node scripts/admin-ban-all.mjs <USER_UUID> "Platform ban"
```

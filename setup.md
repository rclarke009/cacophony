# Cacophany Setup Guide

## Supabase Setup

### 1. Create Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose org, name (e.g. `cacophany`), DB password, and region. Create.
4. Wait for the project to finish provisioning.

### 2. Get Environment Variables

In Supabase Dashboard → **Project Settings** (gear) → **API**:

| Variable | Where to find |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (keep secret; server-side only) |

### 3. Database Schema

1. Supabase Dashboard → **SQL Editor** → **New query**
2. Open `supabase/schema.sql` in this repo and copy its contents
3. Paste into the SQL Editor and click **Run**
4. Confirm all statements completed without errors.

### 4. Run Migration (server_id on invites)

1. Run `supabase/migrations/002_add_server_id_to_invites.sql` in the SQL Editor
2. This adds `server_id` to invites so invite codes can target specific servers

### 5. Seed Default Server

1. Supabase Dashboard → **Authentication** → **Users** → copy your user's UUID
2. Open `supabase/seed.sql`, replace `YOUR_USER_ID_HERE` with that UUID
3. Run `supabase/seed.sql` in the SQL Editor

### 6. (Optional) Realtime for Live Messages

To enable live message updates when others send messages (or when you send from another tab):

**Option A — Dashboard:** Supabase Dashboard → **Database** → **Publications** (not Replication). Under `supabase_realtime`, toggle on the `messages` table.

**Option B — SQL:** In the SQL Editor, run: `ALTER PUBLICATION supabase_realtime ADD TABLE messages;`

Note: The "Replication" page (BigQuery, Iceberg) is for data warehouses, not for live chat. Use **Publications** instead.

### 7. If you see "infinite recursion detected in policy for relation 'server_members'"

1. Run `supabase/migrations/001_fix_server_members_rls_recursion.sql` in the SQL Editor
2. This fixes the RLS policies that were causing the recursion

### 8. Server Icons (emoji, color, custom image)

1. Run `supabase/migrations/004_add_icon_emoji_to_servers.sql`
2. Run `supabase/migrations/005_add_icon_color_to_servers.sql`
3. For custom image uploads: create a **Storage** bucket named `server-icons`, set it to **public**. Or run `supabase/migrations/006_create_server_icons_bucket.sql` in the SQL Editor (if supported).

---

## Invite Flow

**System invite** (platform signup): Share `https://www.cacophony.us/signup?invite=cacophany-welcome`. New users sign up and enter the app. They land in a **safe area** that explains they need invitations to join conversations (servers).

**Server invite**: Share `https://www.cacophony.us/join/CODE` where CODE is an invite created for a specific server. Example: `https://www.cacophony.us/join/home-invite` (from seed). Logged-in users are added to that server and redirected to its chat. New users are redirected to signup with the code pre-filled; after signup they are added to the server automatically.

---

## Vercel Setup

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com) and sign in
2. **Add New** → **Project**
3. Import your GitHub repo

### 2. Environment Variables

In Vercel → Project → **Settings** → **Environment Variables**, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | From Supabase → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | From Supabase → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | From Supabase → API |
| `NEXT_PUBLIC_APP_URL` | `https://www.cacophony.us` | Production app URL (password reset & auth redirects) |

**Important:** Redeploy after adding or changing env vars.

### 3. Supabase Auth URL Configuration (required for www.cacophony.us)

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://www.cacophony.us`
3. Under **Redirect URLs**, add (one per line):
   - `https://www.cacophony.us`
   - `https://www.cacophony.us/**`
   - `https://www.cacophony.us/auth/callback`
4. If you still use a Vercel preview URL for staging, you can also add that URL and `https://your-app.vercel.app/**` for testing.

---

## Local Development

1. Copy `.env.local.example` to `.env.local`
2. Paste your Supabase values into `.env.local`
3. Run `npm install` and `npm run dev`

---

## Testing Create Server & Create Channel

### Prerequisites

- App running (`npm run dev` locally or deployed)
- At least one user signed in

### Create Server

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Visit `/chat` with no servers (or use a fresh account) | Welcome screen shows "Create your own server" button |
| 2 | Click "Create your own server" | Modal opens asking for server name |
| 3 | Enter a name (e.g. "My Server") and click Create | Redirects to new server's general channel |
| 4 | Check left sidebar | New server icon appears |
| 5 | Click the **+** icon in the left sidebar (between servers and Settings) | Same create-server modal opens |
| 6 | Submit with empty name | Error: "Server name is required" |
| 7 | Submit with valid name | New server created, redirects to it |

### Create Channel

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open a server where you are **owner** or **admin** | "Create channel" link appears at bottom of channel list |
| 2 | Click "Create channel" | Modal opens with name and type (text/voice) fields |
| 3 | Enter name (e.g. "random"), leave type as Text, click Create | Redirects to new channel; it appears in sidebar |
| 4 | Create another channel with type Voice | Voice channel appears in list |
| 5 | Open a server where you are **member** (not owner/admin) | "Create channel" does **not** appear |
| 6 | Submit create-channel form with empty name | Error: "Channel name is required" |

### Quick local test

```bash
npm run dev
```

1. Sign in (or sign up with invite `cacophany-welcome`)
2. If you have no servers: click "Create your own server", name it "Test", submit
3. In the server sidebar, click "Create channel", add "random", submit
4. Confirm both server and channel appear and you can send messages

---

## Checklist

- [ ] Supabase project created
- [ ] Schema run in Supabase SQL Editor
- [ ] Migration 002 run (server_id on invites)
- [ ] Seed run with your user ID
- [ ] Vercel env vars set (all 4: Supabase URL, anon key, service role key, `NEXT_PUBLIC_APP_URL=https://www.cacophony.us`)
- [ ] Supabase Auth → URL Configuration: Site URL = `https://www.cacophony.us`, Redirect URLs include `https://www.cacophony.us/**` and `https://www.cacophony.us/auth/callback`
- [ ] Custom domain www.cacophony.us added in Vercel (or your host) and nameservers set
- [ ] Project redeployed after env or domain changes

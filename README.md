# Cacophany

Invite-only Discord-like chat for friends. Built with Next.js 15, Supabase, and shadcn/ui.

---

## Setup

### 1. Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account (or sign in).
2. Click **New Project**.
3. Choose organization, name (e.g. `cacophany`), DB password, and region. Create.
4. Wait for the project to finish provisioning.

### 2. Environment Variables

1. In Supabase Dashboard → **Project Settings** (gear) → **API**:
   - Copy **Project URL** → https://dlpzpxhqjsqwgigfsrcq.supabase.co  `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → sb_publishable_zN6u5vQus9uVkxZPnMAp8w_gn7vqtRk  `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret; used only server-side)

2. Create `.env.local` in the project root:

```bash
cp .env.local.example .env.local
```

3. Edit `.env.local` and paste your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Database Schema

1. In Supabase Dashboard → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` in this repo and copy its contents.
3. Paste into the SQL Editor and click **Run**.
4. Confirm all statements completed without errors.

### 4. (Optional) Seed Default Server

After your first user signs up:

1. Supabase Dashboard → **Authentication** → **Users** → copy your user’s UUID.
2. Open `supabase/seed.sql`, replace `YOUR_USER_ID_HERE` with that UUID.
3. Run `supabase/seed.sql` in the SQL Editor.

---

## Testing the Invitation System

### Prerequisites

1. **Schema & seed run:** `schema.sql` and `seed.sql` executed in Supabase SQL Editor (seed creates invite code `cacophany-welcome`).

2. **First user exists:** Either created in Supabase Dashboard → Auth → Users, or signed up before you disabled public signups.

3. **App running:** `npm run dev` locally, or deployed on Vercel.

4. **Supabase Auth URLs:** If testing on Vercel, add your deploy URL to Supabase → Auth → URL Configuration → Redirect URLs.

### Test Steps

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Visit `/signup` (no invite) | Form shows; invite code field empty. |
| 2 | Submit without invite code | Error: "Invite code is required". |
| 3 | Visit `/signup?invite=cacophany-welcome` | Invite code field pre-filled with `cacophany-welcome`. |
| 4 | Use a fake code (e.g. `wrong-code`) | Error: "Invalid or expired invite code". |
| 5 | Enter valid code `cacophany-welcome`, valid email/password | Redirects to home; new user created; invite marked as used. |
| 6 | Use same code again (new email) | Should work until `uses` reaches `max_uses` (10). |
| 7 | Check Supabase → Auth → Users | New user appears. |
| 8 | Check Supabase → Table Editor → `invites` | `uses` incremented, `used_by_user_id` set. |

### Quick local test

```bash
npm run dev
```

Open [http://localhost:3000/signup?invite=cacophany-welcome](http://localhost:3000/signup?invite=cacophany-welcome) and sign up with a test email.

---

## Tricky Parts

| Step | Gotcha | Fix |
|------|--------|-----|
| **Env vars** | `.env.local` is gitignored — copy from `.env.local.example` and fill in. | Create `.env.local` before `npm run dev`. |
| **Supabase keys** | Anon key is public; service role key is secret. | Never put `SUPABASE_SERVICE_ROLE_KEY` in client code. |
| **Schema** | RLS policies block access if user isn't a member. | Run `schema.sql` first. Add yourself to a server via `seed.sql` after signup. |
| **Build** | `tw-animate-css` / `shadcn/tailwind.css` can cause resolve errors. | Removed for now; animations can be added later. |

---

## Run

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build & Production

```bash
npm run build
npm start
```

---

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/        # React components
│   └── ui/           # shadcn/ui components
├── lib/
│   ├── supabase/     # Supabase client (browser + server)
│   └── utils.ts      # Utilities (cn, etc.)
├── providers/        # React Query, etc.
supabase/
├── schema.sql        # Database schema + RLS
└── seed.sql          # Optional seed for default server
```

---

## Realtime (Live Messages)

To enable live message updates when others send messages:

**Option A — Dashboard:** Supabase Dashboard → **Database** → **Replication** → enable replication for the `messages` table.

**Option B — SQL:** In the SQL Editor, run `supabase/replication.sql` (adds `messages` to the realtime publication).

## Next Steps

- [x] Implement auth (login/signup with Supabase Auth)
- [x] Invite-only signup flow (validate invite code before creating user)
- [x] Build chat UI (sidebar, channels, messages)
- [x] Supabase Realtime for messages and typing indicators
- [ ] Storage for avatars and attachments


to share:
https://cacophany.vercel.app/signup?invite=cacophany-welcome

https://cacophony-ten.vercel.app/signup?invite=cacophany-welcome
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
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
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

## Next Steps

- [ ] Implement auth (login/signup with Supabase Auth)
- [ ] Invite-only signup flow (validate invite code before creating user)
- [ ] Build chat UI (sidebar, channels, messages)
- [ ] Supabase Realtime for messages and typing indicators
- [ ] Storage for avatars and attachments

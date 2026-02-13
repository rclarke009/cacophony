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

### 4. Seed Default Server

1. Supabase Dashboard → **Authentication** → **Users** → copy your user's UUID
2. Open `supabase/seed.sql`, replace `YOUR_USER_ID_HERE` with that UUID
3. Run `supabase/seed.sql` in the SQL Editor

### 5. (Optional) Realtime for Live Messages

1. Supabase Dashboard → **Database** → **Replication**
2. Enable replication for the `messages` table

Ran  ALTER PUBLICATION supabase_realtime ADD TABLE messages; in sql editor

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

**Important:** Redeploy after adding or changing env vars.

### 3. Auth Redirect URLs

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your Vercel URL to **Redirect URLs**:
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/**`

---

## Local Development

1. Copy `.env.local.example` to `.env.local`
2. Paste your Supabase values into `.env.local`
3. Run `npm install` and `npm run dev`

---

## Checklist

- [ ] Supabase project created
- [ ] Schema run in Supabase SQL Editor
- [ ] Seed run with your user ID
- [ ] Vercel env vars set (all 3)
- [ ] Redirect URLs added in Supabase
- [ ] Project redeployed on Vercel after env changes

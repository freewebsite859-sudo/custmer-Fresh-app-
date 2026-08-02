# Nexora Customer PWA — Deployment Guide (Vercel)

## Architecture

- **Frontend:** React 19 + Vite 6 SPA → built to `dist/` (static hosting on Vercel)
- **Backend API:** single endpoint `POST /api/suggest-times`
  - Local dev / Node hosts: served by Express (`server.ts` → `npm start`, port 3000)
  - Vercel: served by the serverless function `api/suggest-times.ts` (identical behaviour, same fallbacks)
- `vercel.json` handles the SPA fallback rewrite (`/api/*` is reserved for functions; static files always win over rewrites).

## Required environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (all environments: Production + Preview):

| Variable | Required | Where to get it |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ Yes | `https://qwaehqsmodekbgvnaavz.supabase.co` (Supabase → Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Supabase → Settings → API → `anon` `public` key (safe for browsers; validated at runtime to match the approved project) |
| `GEMINI_API_KEY` | Optional | Google AI Studio. If missing, `/api/suggest-times` returns a safe static suggestion instead of failing |

⚠️ If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing or do not match the approved project, the app renders a **"Configuration required"** screen instead of failing silently (by design).

## Deploy steps (Vercel)

1. Push this repo to GitHub (already done: `main`).
2. Vercel → **Add New → Project** → import `freewebsite859-sudo/custmer-Fresh-app-`.
3. Framework preset: **Vite** (auto-detected). Confirm:
   - Build Command: `npm run build` (already in `vercel.json`)
   - Output Directory: `dist` (already in `vercel.json`)
   - Install Command: `npm install`
4. Add the environment variables from the table above.
5. **Deploy.** Node.js 20.x is the current Vercel default and works with this repo.

## Post-deploy: reviews persistence (recommended)

Customer service reviews are written to the shared `customer_reviews` table in the Supabase project. The app degrades gracefully (reviews stay session-only) until the table exists, so **run this once** in Supabase → SQL Editor:

```sql
-- full script: db/customer_reviews.sql
create table if not exists public.customer_reviews (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  salon_id text not null,
  service_id text,
  service_name text not null,
  author text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text not null,
  verified_booking boolean not null default false,
  booking_id text,
  created_at timestamptz not null default now()
);
alter table public.customer_reviews enable row level security;
-- + RLS policies (select/insert/update/delete own rows) and realtime, see the file.
```

## Post-deploy: Supabase dashboard config (REQUIRED for signup/login to work)

These live in the Supabase project (`qwaehqsmodekbgvnaavz`) dashboard — they cannot be set from this repo:

1. **Authentication → URL Configuration**
   - Site URL: `https://<your-vercel-domain>`
   - Redirect URLs: add `https://<your-vercel-domain>/**` (needed for email confirmation + password reset links)
2. **Authentication → Emails/SMTP:** confirmation emails are currently NOT delivered via the default mailer. Configure a custom SMTP provider (or the signup → login flow stays blocked with `email_not_confirmed`).
3. **Authentication → Providers → Google:** currently disabled. Enable + add OAuth client ID/secret, or remove/ignore the Google button outcome (it will show an error).

## Alternative: Node hosts (Render / Railway) — zero code change

This repo already supports classic Node hosting: Build `npm install && npm run build`, Start `npm start`.
Note: `server.ts` currently listens on hardcoded port `3000` — set the host's routing/health check accordingly.

## Post-deploy verification checklist

1. Open the deployed URL → app loads (no "Configuration required" screen).
2. Login/signup attempt reaches `https://qwaehqsmodekbgvnaavz.supabase.co/auth/v1/...` (browser devtools → Network).
3. Wrong-role / inactive accounts show the role-conflict screen and are signed out.
4. `curl -X POST https://<your-vercel-domain>/api/suggest-times -H "content-type: application/json" -d '{}'` → returns JSON with `suggestions`.

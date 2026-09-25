# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Lendrop is a peer-to-peer item rental marketplace app (Salvadoran market — DUI national ID, locker pickup/dropoff). This repo is currently a **base template**: marketing landing page, full Supabase auth, protected routes, brand design tokens, and the full database schema — but almost no in-app product screens exist yet beyond a `Dashboard` placeholder.

## Commands

```bash
npm run dev       # Vite dev server, http://localhost:5173
npm run build     # production build
npm run preview   # preview the production build
npm run lint       # oxlint
```

There is no test runner configured in this repo.

## Environment setup

Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase project (Project Settings → API). `src/lib/supabaseClient.js` throws at import time if either is missing — the app cannot boot without them.

## Database

`supabase/supabase_setup.sql` is the full schema (paste into the Supabase SQL Editor to provision ~19 tables + RLS). `supabase/migrations/0002_identity_and_consent.sql` is a standalone incremental migration for existing projects that predate the `profile_private` split — new projects should just run `supabase_setup.sql`, which already includes it. There is no migration tool wired up (no Supabase CLI config); schema changes are hand-written SQL files applied manually.

Key tables: `profiles` (public), `profile_private` (DUI/date of birth/consent/Lendrop ID — owner-only), `categories`, `items`, `item_photos`, `lockers`/`locker_compartments`/`locker_events`, `reservations`, `payments`, `photo_evidence`, `reviews`, `notifications`, `identity_verifications`, `favorites`, `disputes`, `conversations`/`conversation_participants`/`messages`.

**RLS split pattern**: `profiles` is intentionally public-readable (needed for "Listed by X" on item pages). Any sensitive per-user field (national ID, date of birth, etc.) must go in a separate owner-only table like `profile_private`, never as a column on `profiles` — Postgres RLS is row-level, not column-level, so there's no way to make a single column private on an otherwise-public table. Follow this split for any new sensitive fields.

New user rows are populated via the `on_auth_user_created` trigger → `handle_new_user()` function, which inserts into both `profiles` and `profile_private` from `raw_user_meta_data` at signup time (see `AuthContext.jsx`'s `signUp`, which passes `full_name`, `dui`, `date_of_birth`, `terms_accepted` through `options.data`).

## Architecture

- **Routing**: single `BrowserRouter` in `App.jsx` with a flat route list; unknown paths redirect to `/`. Protected routes are wrapped in `<ProtectedRoute>` (`src/components/ProtectedRoute.jsx`), which reads auth state from context and redirects to `/login` while preserving `location.state.from` for post-login redirect.
- **Auth**: `src/context/AuthContext.jsx` wraps the whole app and is the only interface to Supabase auth (`signUp`, `signIn`, `signOut`, `resetPasswordForEmail`, `updatePassword`, plus `user`/`session`/`loading`/`isAuthenticated`). It subscribes to `supabase.auth.onAuthStateChange` on mount, so session state updates automatically after any auth call — call sites don't need to manually refetch session after sign-in/out.
- **Supabase client**: `src/lib/supabaseClient.js` is a singleton; always import `supabase` from there rather than creating new clients.
- **Known gap**: the landing page category tiles (`src/pages/Home.jsx`) are a hardcoded array of 6 items, while the canonical 11-row list lives in the `categories` table. When building the Explore screen (or updating Home), prefer fetching from `categories` over hardcoding so the two never drift apart again.

## Design tokens

Defined in `src/index.css` as Tailwind v4 utilities — use these instead of raw hex values or ad hoc classes:

| Token | Value | Tailwind class |
|---|---|---|
| Deep Purple | `#433075` | `bg-deep-purple`, `text-deep-purple` |
| Lavender | `#a58cf4` | `bg-lavender`, `text-lavender` |
| Soft White | `#fafafa` | `bg-soft-white` |
| Jet Black | `#0d0d0d` | `text-jet-black` |
| Space Grotesk | — | `font-display` (headings) |
| Manrope | — | `font-body` (body text, default) |
| JetBrains Mono | — | `font-mono` / `.locker-code` class (locker codes) |

## Repo hygiene rules (from README)

- Never run `git add .` without checking `git status` first — watch for `node_modules/` or `.env` showing up.
- Always work on a branch, never commit directly to `main`.
- Get a PR reviewed before merging to `main`.

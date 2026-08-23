# Lendrop 

Clean template to start the repo fresh. Comes with: the public marketing
landing page, full Supabase authentication, protected routes, brand
design tokens, and the database schema.

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and paste your `Project URL` and `anon public key` (Supabase →
Project Settings → API). **Never commit this file to GitHub** — it's
already ignored in `.gitignore`.

## 3. Create the tables in Supabase

1. Go to your project on supabase.com → **SQL Editor**.
2. Paste the full contents of `supabase/supabase_setup.sql` and hit **Run**.
3. Check **Table Editor** to confirm ~19 tables appeared (profiles, items,
   reservations, lockers, payments, etc.)

## 4. Run the app

```bash
npm run dev
```

Open `http://localhost:5173`. You should see the landing page.

## 5. Test the auth flow

1. Go to `/signup`, create an account.
2. Check the verification email (Supabase sends it automatically).
3. Confirm the email → log in at `/login`.
4. You should land on `/dashboard` with an active session.

---

## Route map

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Marketing landing page |
| `/login` | Public | Log in |
| `/signup` | Public | Create an account |
| `/forgot-password` | Public | Request a password reset link |
| `/reset-password` | Public | Set a new password (from the email link) |
| `/dashboard` | Protected | Authenticated app — placeholder for now |

## Project structure

```
src/
├── lib/
│   └── supabaseClient.js     # Single Supabase connection (singleton)
├── context/
│   └── AuthContext.jsx       # signUp, signIn, signOut, resetPassword, session
├── components/
│   ├── ProtectedRoute.jsx    # Blocks routes for unauthenticated users
│   ├── AuthLayout.jsx        # Shared card + brand header for auth screens
│   ├── AuthTabs.jsx          # Log in / Sign up segmented control
│   ├── PasswordInput.jsx     # Password field with show/hide toggle
│   └── StatusMessage.jsx     # Success/error banner
├── pages/
│   ├── Home.jsx               # Public landing page ("/")
│   ├── Login.jsx
│   ├── Signup.jsx
│   ├── ForgotPassword.jsx
│   ├── ResetPassword.jsx
│   └── Dashboard.jsx          # Authenticated placeholder ("/dashboard")
├── App.jsx                    # App routes (react-router-dom)
├── main.jsx                   # Entry point
└── index.css                  # Lendrop design tokens (Tailwind v4)

supabase/
└── supabase_setup.sql         # Full schema + RLS, ready to paste into Supabase
```

## Design tokens

Already configured in `src/index.css` as Tailwind utilities:

| Token | Value | Tailwind class |
|---|---|---|
| Deep Purple | `#433075` | `bg-deep-purple`, `text-deep-purple` |
| Lavender | `#a58cf4` | `bg-lavender`, `text-lavender` |
| Soft White | `#fafafa` | `bg-soft-white` |
| Jet Black | `#0d0d0d` | `text-jet-black` |
| Space Grotesk | — | `font-display` (headings) |
| Manrope | — | `font-body` (body text, default) |
| JetBrains Mono | — | `font-mono` / `.locker-code` class (locker codes) |

## Landing page categories — known gap

The category tiles on the landing page (`src/pages/Home.jsx`) are a
hardcoded, curated preview of 6 items. The canonical list of categories
lives in the `categories` table in Supabase (11 rows — see
`supabase/supabase_setup.sql`). Once the Explore screen exists, both it
and this landing section should fetch from that table instead of a
hardcoded array, so marketing copy and the in-app catalog never drift
apart again.

## Rules to keep the repo from breaking again

- **Never** run `git add .` without checking `git status` first. If you
  see `node_modules/` or `.env` in the list, something's wrong — check
  the `.gitignore`.
- Always work on a branch (`git checkout -b branch-name`), never
  directly on `main`.
- Get a Pull Request reviewed before merging to `main`.
- One repo = one project. Don't mix code from another project into
  this repo.

## Suggested next step

Create the **Supabase Storage** buckets (`item-photos`,
`identity-documents`, `evidence-photos`) from the dashboard — the SQL
script only creates tables, not buckets.

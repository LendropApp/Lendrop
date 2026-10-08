# Pitch demo videos

Scripted recordings of the real Lendrop UI, 1440×900, for the pitch deck
(they sit inside a browser frame in PowerPoint). Output: H.264, yuv420p,
30 fps, CRF 18, no audio, in `out/` (gitignored).

```bash
# at the repo root: the production build. The dev server's StrictMode
# double-mounts the checkout and races two create_checkout calls.
npm run build && npm run preview   # http://localhost:4173

# here
npm install
node video1-signup.mjs        # Sign-up + Lendrop ID → out/video1_registro_lendrop_id.mp4
node video2-booking.mjs       # Search, dates, pay   → out/video2_buscar_alquilar_pagar.mp4
node video3-publish.mjs       # Publish + AI price   → out/video3_publicar_precio_ia.mp4
node video3-publish.mjs --still   # 2x PNG of the form with the AI price → out/publicar_precio_ia_2x.png
```

`out/review/*_sheet.png` is a contact sheet (4 frames a second) of each cut.

## How it films

- **Frame-stepped, not real time.** Time is frozen in the page; each frame
  advances the page clock and every CSS transition/animation by exactly
  1/30 s, then takes a quality-100 screenshot (`lib/director.mjs`). The CDP
  screencast was tried first: on this machine it ran at ~19 fps and delivered
  frames seconds late, so they couldn't be lined up with the actions.
- **Cursor, clicks, zoom** are injected with `addInitScript` (`lib/overlay.js`):
  32 px arrow gliding in 450 ms ease-out, 0.85 press for 120 ms, lavender ring
  0 → 60 px in 450 ms, zoom as a 700 ms ease-in-out CSS transform on `#root`.
  Scrollbars are hidden.
- **Cutting and speed-ups** happen in ffmpeg (`lib/encode.mjs`): each segment
  between two marks is trimmed and sped up with `setpts`, then the last frame
  is held for 1 s.

## Data

- Every Supabase write is aborted unless a script allows it (`#guard` in
  `lib/director.mjs`); reads, read-only RPCs and password sign-in pass.
- Video 1's sign-up request is answered by a mock. A real `signUp()` would
  email a confirmation link to the demo address.
- None of this data exists any more: it was all deleted after filming on
  2026-10-07. To film again, recreate it the same way.
- Demo accounts, created by hand with SQL as already confirmed (no email is
  ever sent), both verified (Alejandra also a host, for video 3):
  - **Alejandra Rivas** (`alejandra.rivas@gmail.com`), the renter. Her
    settings live in `.env.demo` (gitignored): `DEMO_EMAIL`,
    `DEMO_PASSWORD`, `DEMO_FULL_NAME`, `DEMO_DUI`, `DEMO_DOB`, `DEMO_USER_ID`.
  - **Carlos Méndez** (`carlos.mendez@lendrop-demo.invalid`), the host, with
    three camping tents (photos hot-linked from Unsplash). Nobody signs in
    as him.
- Video 2 really books: `create_checkout` and the `payments-checkout`
  function (Wompi mock mode) are the only writes it lets through. A booking
  blocks those dates, so reset before another take:

```sql
delete from public.locker_events where reservation_id in
  (select id from public.reservations where renter_id = (select id from auth.users where email = 'alejandra.rivas@gmail.com'));
delete from public.reservations where renter_id = (select id from auth.users where email = 'alejandra.rivas@gmail.com');
delete from public.notifications where user_id in
  (select id from auth.users where email in ('alejandra.rivas@gmail.com', 'carlos.mendez@lendrop-demo.invalid'));
```

- Video 3 really publishes: the listing, its three photos in the
  `item-photos` bucket (from `assets/`, see `assets/CREDITS.md`) and their
  rows. `--encode-only` re-cuts the last take without publishing again.

When filming is done: `node cleanup.mjs` (storage objects can only be
deleted through the Storage API), then the reset above, then delete both
accounts, which cascades to their profiles, `profile_private`, items and
photo rows:

```sql
delete from auth.users where email in ('alejandra.rivas@gmail.com', 'carlos.mendez@lendrop-demo.invalid');
```

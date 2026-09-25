# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences with equal weight:

- **Renters**: people in El Salvador who need an item for a few days and would rather rent than buy it.
- **Hosts (lenders)**: people who own items and want to earn from them by listing them for rent.

Admins also exist (`/admin`) but are an internal audience.

## Product Purpose

Lendrop is a peer-to-peer rental marketplace. The full loop is: publish → search → reserve → pay → locker drop-off → pickup → return → deposit release → review. Success means that loop completes end to end without the two parties having to meet in person.

## Positioning

Handoffs happen through lockers, not meetups. The owner drops the item into an assigned locker compartment and the renter collects it by confirming their identity (DUI plus their private 6-character Lendrop ID, shown as ABC-123) at the locker. Every locker event is logged. Identity is tied to the Salvadoran national ID (DUI), and photo evidence is required before and after each rental.

## Operating Context

- Market: El Salvador. Currency USD. Payments through Wompi El Salvador (sandbox today, production later).
- Lockers are simulated in software today (state + identity check). Physical hardware comes later behind the same `LockerProvider` interface.
- Item size is estimated and checked against locker compartment sizes before listing.
- Users switch between renter and host roles in the same account (host onboarding at `/become-host`).

## Capabilities and Constraints

- Stack: React + Vite + Tailwind v4, Supabase (auth, Postgres + RLS, storage, edge functions). No test runner beyond a single Explore performance test.
- ~30 routes: public (landing, auth, explore, item detail), renter (rental tracking, favorites, history, messages, notifications, payment methods, verification, premium), host (publish, my listings, owner delivery, earnings, locker coverage), admin.
- Light / dark / system theme with semantic color tokens (from `fix/cta-gradient-contrast`, to be carried into the redesign).
- AI price suggestion when publishing (Claude Haiku via edge function).
- All UI copy is English only.

## Brand Commitments

- Name: Lendrop. Logo: `public/logo-lendrop.png`, `public/favicon.svg`.
- Colors: Deep Purple `#433075` and Lavender `#a58cf4` are binding brand colors. Typography, layout, and surfaces are open for the redesign.

## Evidence on Hand

- No real testimonials, user counts, ratings, press, or partner logos exist. None may be fabricated.
- Locker locations: sample data uses "Downtown San Salvador". Real coverage is not confirmed.
- Legal copy: `src/content/PrivacyPolicy.jsx`, `src/content/TermsOfService.jsx`.

## Product Principles

1. Trust is the product: verification, evidence, and locker logs should be visible, not hidden in fine print.
2. No meetups: every flow should make the locker handoff feel simpler than meeting a stranger.
3. Two-sided by default: every surface serves renters and hosts without making either feel secondary.
4. Show real state, never invented proof.

## Accessibility & Inclusion

WCAG AA contrast in both light and dark themes (already enforced for the brand CTA gradient).

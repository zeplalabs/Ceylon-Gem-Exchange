# Remaining work

A living checklist against the 24-epic plan (_Ceylon Gems — End-to-End
Development Plan_, Confluence space ZLP). Generated 2026-10-13 from a direct
audit of the codebase (schema tables, CI config, grep for Stripe/Typesense/S3
code, etc.) — not a guess from memory. Update this file as epics move, rather
than re-deriving the whole thing from scratch each time.

**Status legend:** ✅ done · ⚠️ partial/UI-only · ❌ not started

## Critical path

**E1.1 Listings Core is the actual next priority**, ahead of everything else
in Phase 1. There is currently **no `listings` table in the database at
all** — every listing in the app (`Ceylon Blue Sapphire`, etc.) is static
data in `apps/mobile/lib/listings.ts`. E1.4, E1.5, E1.6, and E1.9 all
assume a real listing to attach to and can't become real until this exists.
Media (E1.2) and Search (E1.3) are the next layer after that — both need
listings to exist before there's anything to upload photos for or index.

---

## Phase 0 — Foundations

- [x] **E0.1** Monorepo & Infrastructure Baseline — ⚠️ partial
  - [x] Turborepo + pnpm workspace
  - [x] GitHub Actions: lint, typecheck, check-i18n, build
  - [ ] CI's "Test" job calls `pnpm test` — **no test actually exists anywhere in the repo**, this job is currently a no-op
  - [ ] Terraform / cloud infra (or the MVP PaaS variant: Vercel + Railway + Neon + Upstash) — deliberately deferred per `CLAUDE.md`'s local-first sequencing
  - [ ] Secrets management, per-env config — local `.env` only so far
- [x] **E0.2** Auth & Identity — ✅ mostly done
  - [x] Clerk: email, phone-OTP
  - [ ] Clerk: Google, Apple (UI row exists, not wired — visual only)
  - [x] `users` table + `role` enum (`user`/`admin`/`moderator`)
  - [x] JWT verification middleware (`ClerkAuthGuard` + `RolesGuard`)
  - [ ] Real Sri Lankan phone sign-up is blocked — Clerk SMS tier issue, needs a support ticket (see memory)
- [x] **E0.3** Design System & Trilingual Routing — ✅ mostly done
  - [x] `packages/ui-tokens` design tokens
  - [x] `packages/i18n` — EN/SI/TA dictionaries, CI-enforced key parity
  - [x] Mobile locale switching (`LocaleProvider`)
  - [ ] `/[locale]` URL routing — N/A until a web app exists
  - [ ] Component kit "shared by web and mobile" — currently mobile-only, no web app to share with yet

## Phase 1 — MVP

- [ ] **E1.1** Listings Core — ❌ not started
  - [ ] `listings` / `gem_details` / `equipment_details` schema
  - [ ] CRUD API: draft → pending_review → active → expired / sold / removed
  - [ ] Type toggle (gem / equipment) swapping the detail schema
- [ ] **E1.2** Media Pipeline — ❌ not started
  - [ ] Presigned S3 upload + client-side compression (MinIO container already running locally, unused)
  - [ ] Variant generation (thumb/card/detail, webp/avif), EXIF GPS stripped
  - [ ] Rekognition + Claude vision moderation triage
- [ ] **E1.3** Search & Discovery — ❌ not started
  - [ ] Typesense facets (species, carat, treatment, cert, origin, price) — Typesense container already running locally, unused
  - [ ] Outbox → indexer worker, nightly full reindex
  - [ ] Browse pages + SSG species landing pages — N/A until web exists
- [ ] **E1.4** Listing Detail & Buyer Engagement — ⚠️ UI-only
  - [x] Gallery (zoom/video), spec table — real, polished
  - [x] WhatsApp deep-link
  - [ ] Inquiry threads — `chat/[id].tsx` screen exists, no `messages` table, nothing persists
  - [ ] Rate-limited phone reveal — not implemented
  - [ ] Favorites, saved searches + alerts — screens exist, no backend persistence
  - [ ] Block-a-seller — not implemented
  - [x] Similar / recently-viewed rails (UI)
- [ ] **E1.5** Seller Onboarding & Posting Flow — ⚠️ UI-only
  - [x] 3-step posting wizard screen (`post-ad.tsx`)
  - [ ] Seller profile + NGJA licence verification review
  - [ ] Phone-verify-to-post hard gate
  - [ ] AI-drafted listings (EN + Sinhala)
  - [ ] Real submission endpoint (blocked on E1.1)
- [ ] **E1.6** Seller Dashboard — ⚠️ UI-only
  - [x] `my-ads.tsx` screen
  - [ ] Real status/renew/edit/mark-sold backend
  - [ ] Per-listing views & inquiry stats
  - [ ] Promotions picker backend
- [ ] **E1.7** Monetization & Billing — ❌ not started
  - [ ] Plans (Free/Dealer/Showroom), credit ledger, subscriptions
  - [ ] Stripe Billing + PayHere dual-rail checkout and webhooks
  - [ ] Dunning, invoices/receipts with VAT line
- [ ] **E1.8** Admin & Moderation Panel — ❌ not started
  - [ ] Moderation queue (cert-format, duplicate, high-value-no-cert, sanctioned-origin flags)
  - [ ] Seller verification review, reports & strikes
  - [ ] Blocked-keywords list, audit log
  - (only existing "admin" code is a one-line guard-test endpoint, `GET /me/admin-check`)
- [ ] **E1.9** Notifications — ⚠️ UI-only
  - [x] `NotificationsProvider` + unread badge (client-side)
  - [ ] Domain event → SQS → fan-out worker (email/push/in-app)
  - [ ] Saved-search alert digests
- [x] **E1.10** Mobile App MVP — ✅ furthest along
  - [x] Expo screens: home, search-results, listing detail, post-ad, chat, profile, notifications, favourites, my-ads, my-membership, payment-method, saved-searches, all-listings, certificate viewer, gallery
  - [x] Shared i18n + design tokens from the monorepo
  - [x] Deep links (`ceylongems://`) — custom dev client, not Expo Go
  - [ ] Most of the above screens aren't wired to a real backend yet — see their respective epics above
- [ ] **E1.11** Launch Hardening — ❌ not started
  - [ ] Playwright (web) + Detox (mobile) E2E suites
  - [ ] Lighthouse ≥ 90 mobile, WCAG 2.1 AA pass
  - [ ] Safety guide, terms, prohibited-items content (trilingual)

## Phase 2 — Deepen

Not started (correctly — Phase 1 isn't done):

- [ ] **E2.1** Storefronts & Follows
- [ ] **E2.2** Bulk Upload & Showroom Tools
- [ ] **E2.3** Seller Analytics v2 & BI
- [ ] **E2.4** Mobile Store Launch & OTA Cadence

## Phase 2.5 — Ceylon Gems Direct

Not started:

- [ ] **E2.5.1** Direct Buy-Now & Fulfillment Ops — gated behind 2+ months of clean own-store ops + legal review before inviting consignment sellers

## Phase 3 — Transactions (data-gated)

Deliberately not scheduled — trigger is sustained inquiry volume above
500/month for 3 consecutive months:

- [ ] **E3.1** Managed Checkout & Escrow Payouts
- [ ] **E3.2** Auction Engine

## Cross-cutting (ongoing, all phases)

- [ ] **EX.1** Analytics & Event Tracking — ❌ not started (no PostHog, no `events` table)
- [ ] **EX.2** Security & Compliance — ⚠️ partial
  - [x] JWT auth guard + role-based guard
  - [x] Row Level Security enabled on all Supabase tables
  - [ ] Rate limiting on contact-reveal & inquiries
  - [ ] PDPA/GDPR data export & deletion
  - [ ] Phone masking until reveal
  - [ ] Formal OWASP ASVS L2 checklist
- [ ] **EX.3** Observability & Disaster Recovery — ❌ not started (no Sentry, no CloudWatch, no backup/DR strategy beyond Docker/Supabase defaults)

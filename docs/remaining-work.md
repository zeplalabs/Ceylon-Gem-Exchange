# Remaining work

A living checklist against the 24-epic plan (_Ceylon Gems — End-to-End
Development Plan_, Confluence space ZLP). Generated 2026-10-13 from a direct
audit of the codebase (schema tables, CI config, grep for Stripe/Typesense/S3
code, etc.) — not a guess from memory. Update this file as epics move, rather
than re-deriving the whole thing from scratch each time.

**Status legend:** ✅ done · ⚠️ partial/UI-only · ❌ not started

## Critical path

**E1.1 Listings Core is done, and `post-ad.tsx` now actually writes to
it** — this was the real blocker and it's closed on the write side. The
`listings` / `gem_details` / `equipment_details` schema exists (migrated);
a real CRUD API sits in front of it
(`apps/api/src/listings/listings.controller.ts`); the posting wizard has a
Gem/Equipment `SegmentedControl` that swaps Step 3's detail form between
the two schemas; and tapping "Publish now" now creates a real listing
(`POST /listings`), attaches every photo the seller uploaded during the
wizard (`POST /listings/:id/photos` — see E1.2 below), and submits it for
review (`PATCH /listings/:id/status {action:'submit'}`, draft →
pending_review), with the backend's own validation message surfaced
inline on failure.

**What's still missing is the read side.** Nothing in the app _reads_
real listings yet — Home, Search Results, My Ads, and Listing Detail all
still render the static fixtures in `apps/mobile/lib/listings.ts`, so a
listing a seller just published is invisible everywhere except directly in
the database. My Ads (E1.6) wiring to `GET /listings/mine` is the most
immediately valuable next step, since it's the only screen that would
let a seller see the one thing they just did. E1.4's favorites/saved-
searches UI (both have real backends now, see below — it's specifically
the _wiring_ that's blocked on this) and E1.8's moderation queue (nothing
can be approved into `active` without an admin UI yet) are the other real
consumers still blocked on this — inquiry threads and phone reveal, E1.4's
other two items, both found their own way around the block the same way
Media Pipeline's upload did (see below): `chat/[id].tsx` reaches both real
APIs whenever it's given a real listing id, it just never is yet through
any current navigation path. Block-a-seller (E1.4's last item, also real
now) isn't blocked on this the same way — it has no UI anywhere yet to
wire, mockup-matched or otherwise, so it's waiting on new interaction
design, not read-side wiring.

**E1.2 Media Pipeline's upload and variant-generation steps are both
done now**, and neither waited on any of the above — `post-ad.tsx`
compresses and uploads each picked photo to MinIO as soon as it's picked
(keyed to the signed-in seller, not a listing), and `attachPhoto` resizes/
re-encodes every uploaded original into thumb/card/detail × webp/avif the
moment it's attached to a listing — at `draft`/`pending_review`, same as
everything else about a listing before it's approved. E1.2's last item —
Rekognition + Claude vision moderation triage — is deliberately on hold
until an AWS account exists; it's what an admin would eventually use to
help decide whether a `pending_review` listing becomes `active`, but
nothing blocks `approve` on it existing today (that's a manual call via
`PATCH /listings/:id/status`, since E1.8's admin UI doesn't exist yet
either).

**E1.3 Search & Discovery's backend is also done now** — a
`listings`-reaching-`active` event (via the `search_outbox` table every
listing write enqueues into) gets indexed into Typesense within ~10s, and
`GET /search` serves free-text + every documented facet + price-range +
sort, with facet counts for filter-chip UIs. But same as Media Pipeline:
**nothing in the app calls it.** Home's search bar and the Search Results
screen (`apps/mobile/app/search-results.tsx`, part of E1.10's screen list)
are still UI-only against local/static data — wiring that screen to `GET
/search` is the natural next step, and the only thing standing between
"the backend can find a listing" and "a buyer actually can too."

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
- [x] **E0.3** Design System & Trilingual Routing — ✅ done
  - [x] `packages/ui-tokens` design tokens
  - [x] `packages/i18n` — EN/SI/TA dictionaries, CI-enforced key parity
  - [x] Mobile locale switching (`LocaleProvider`)
  - [x] `/[locale]` URL routing — `apps/web` (Next.js 15, App Router), `middleware.ts` redirects bare paths to `defaultLocale`, invalid locales 404
  - [x] Design tokens reach a real web app — `apps/web` imports `@ceylon-gems/ui-tokens` and `@ceylon-gems/i18n` directly (same dictionaries/gem-tone colors mobile uses, not duplicated copies). **Not** literal React Native component reuse via react-native-web — matches this project's existing pattern elsewhere (`LiveGradientBackground.web.tsx`) of platform-appropriate re-implementations sharing tokens/content, not forced one-codebase components. `apps/web` is currently one proof-of-concept page, not a built-out site.

## Phase 1 — MVP

- [x] **E1.1** Listings Core — ✅ done, and now actually consumed by `post-ad.tsx`'s submit flow
  - [x] `listings` / `gem_details` / `equipment_details` schema
  - [x] CRUD API: draft → pending_review → active → expired / sold / removed
  - [x] Type toggle (gem / equipment) swapping the detail schema
- [ ] **E1.2** Media Pipeline — ⚠️ upload + variants done, moderation deliberately deferred (needs an AWS account)
  - [x] Presigned S3 upload + client-side compression — `POST /media/presign` + `apps/api/src/media/` against the local MinIO `uploads` bucket; `apps/mobile/lib/uploadPhoto.ts` compresses via `expo-image-manipulator` (1600px long edge, JPEG q0.7) and uploads on pick from `post-ad.tsx`'s photo sheet, independently of a listing existing yet (see `listing_photos` table + `POST /listings/:id/photos` to attach once one does)
  - [x] Variant generation (thumb/card/detail, webp/avif), EXIF GPS stripped — `apps/api/src/media/image-variants.ts` (`sharp`), run synchronously in `attachPhoto` (fetches the original from `uploads`, generates all 6 thumb/card/detail × webp/avif buffers, uploads them to the now-publicly-readable `media` bucket, only then inserts the `listing_photos` row — never a row pointing at variants that don't exist). EXIF/GPS stripped is sharp's own default (no `.withMetadata()` call); `.rotate()` bakes in EXIF orientation first so stripping it doesn't flip sideways photos upright-looking-sideways. Variant keys are computed deterministically from `(listingId, photoId)`, not stored — `GET`/`POST`/`PATCH` on a photo all return a `variants: {thumb,card,detail}×{webp,avif}` URL map built the same way
  - [ ] Rekognition + Claude vision moderation triage — **deliberately deferred, on hold until an AWS account exists for Rekognition** (same account-provisioning conversation as the rest of E1.2's cloud dependencies); Claude vision's half doesn't strictly need AWS, but triage is being held as one unit rather than half-built ahead of the account
- [ ] **E1.3** Search & Discovery — ⚠️ backend indexing + search API done, nothing in the app calls it yet
  - [x] Typesense facets (species, carat, treatment, cert, origin, price) — `apps/api/src/search/typesense-client.ts`'s `listings` collection; `GET /search` (`search.controller.ts`) supports free-text (`q`, over title+description), facet filters for every item in the list above plus `type`/`equipmentType`/`condition`/`currency`, a `minPriceCents`/`maxPriceCents` range, `sort` (`price_asc`/`price_desc`/`newest`), and returns `facet_counts` alongside hits for building filter-chip UIs. Only `active` listings are ever indexed — draft/pending_review/sold/expired/removed are correctly absent, verified end-to-end
  - [x] Outbox → indexer worker, nightly full reindex — `search_outbox` table + `enqueueSearchReindex()` called from every `listings.controller.ts` write (create/update/status-transition) in the same request, so a Typesense-side failure can't silently desync from Postgres; `SearchIndexService`'s `@Cron(EVERY_10_SECONDS)` drains it (upserts if the listing is `active`, deletes otherwise), with a `@Cron(EVERY_DAY_AT_2AM)` full reindex (also run once on boot) as the consistency backstop that also sweeps any Typesense document no longer backed by an active listing
  - [ ] Browse pages + SSG species landing pages — N/A until web exists
- [ ] **E1.4** Listing Detail & Buyer Engagement — ⚠️ everything but alerts is real on the backend now; most of it isn't wired into the app yet either
  - [x] Gallery (zoom/video), spec table — real, polished
  - [x] WhatsApp deep-link
  - [x] Inquiry threads — `inquiry_threads` (one per `(listing, buyer)` pair — several buyers can each have their own private thread about the same listing) + `inquiry_messages`, `apps/api/src/inquiries/`: `GET`/`POST /listings/:id/messages`, buyer-only (a seller has no single "the" thread to view — no seller inbox screen exists yet to pick one from, so that GET clearly errors for a seller rather than guessing). `chat/[id].tsx` now loads/sends through this for a real listing id, falling back to its original local-only demo (seed messages + canned reply) for the static fixture ids every current nav path still passes, since Listing Detail isn't wired to the real API yet — see this file's own top comment for the UUID-vs-fixture-id split. Also extended `GET /listings/:id`'s response with `sellerName` (joined from `users`), since Chat's header needed it and nothing exposed it before — `sellerPhone` got the same treatment only to be pulled back out again once phone reveal (below) made that deliberate
  - [x] Rate-limited phone reveal — `POST /listings/:id/reveal-phone` (`apps/api/src/phone-reveal/`), Redis-backed (the container was already running locally, unused): 20 distinct-listing reveals/buyer/hour (`PHONE_REVEAL_LIMIT_PER_HOUR`), fixed-window counter via `INCR`+`EXPIRE`; re-revealing a listing already unlocked (24h TTL) never re-consumes quota, and the listing's own seller always sees their own number free. `GET /listings/:id` no longer returns `sellerPhone` at all — it's only ever fetched on demand, through this endpoint, right before the call/WhatsApp action that needs it (wired into `chat/[id].tsx`'s "Call seller" button for a real listing; Listing Detail's own call/WhatsApp buttons aren't wired yet, same static-vs-real split as everywhere else — see this file's own top comment)
  - [x] Favorites — `apps/api/src/favorites/`: `favorites` table (one row per `(user, listing)` pair, replacing the 5+ independent never-synced local `liked` sets across Home/All Listings/Search Results/Favourites/Listing Detail — see `apps/mobile/lib/listings.ts`'s `defaultLikedIds`). `GET`/`POST`/`DELETE /listings/:id/favorite` (idempotent — `onConflictDoNothing` on the composite unique constraint) + flat `GET /favorites` for the list screen. **Not yet wired into the app**: unlike inquiry threads/phone reveal, there's no existing mockup-matched screen that already both renders a real listing _and_ has a heart affordance in its original design — Listing Detail (where the heart already exists for real) isn't wired to real listings at all, and adding one to Chat would mean inventing UI the mockup never had, which this app's screens deliberately don't do. Waits on Listing Detail's own real-data wiring
  - [x] Saved searches (storage only, no alerts — see below) — `apps/api/src/saved-searches/`: `saved_searches` table + `GET`/`POST`/`PATCH`/`DELETE /saved-searches`, fully private per-user (a non-owner's id 404s rather than 403ing, so existence itself isn't confirmable). `pickedFilters` is jsonb mirroring `home.tsx`'s own group-label-keyed filter-sheet state, not invented structured fields — `query`/`maxPriceCents` likewise mirror exactly what that screen's search box/price slider already expose. **Not wired into the app**: `saved-searches.tsx`'s own "save a new search" buttons are decorative today (no `Pressable`, confirmed in that screen's own comment) — there's no creation flow to wire _to_ yet; that's new interaction design, not backend wiring, so it's out of scope here
  - [x] Alerts — see E1.9's "Saved-search alert digests" below; `saved_searches.alertsEnabled` now gates a real weekly digest worker, not just a stored preference
  - [x] Block-a-seller — `apps/api/src/blocking/`: `blocked_users` table (schema is user-to-user generic — `blockerId`/`blockedId` — even though only the buyer-blocks-seller direction is wired up anywhere), `GET`/`POST`/`DELETE /sellers/:id/block` + flat `GET /blocked-users`. Actually enforced, not just stored: `POST /listings/:id/messages` and `POST /listings/:id/reveal-phone` both reject with a clear error if the caller has blocked that listing's seller; `GET /search` and `GET /listings` both silently exclude a blocked seller's listings for a signed-in caller via a new `getOptionalActor()` soft-auth helper (`auth/acting-user.ts` — succeeds anonymously on a missing/invalid/expired token rather than throwing, since both routes must stay fully usable signed out), verified against the real Typesense `sellerId:!=[...]` negation-filter syntax, not just unit-tested in isolation. **Not wired into the app**: same reasoning as Favorites — `t.listingDetail.blockSeller` is a leftover translated string with zero UI reference anywhere (no button, not even an inert one, confirmed by grep), so there's no existing mockup-matched affordance to wire this to without inventing new UI
  - [x] Similar / recently-viewed rails (UI)
- [ ] **E1.5** Seller Onboarding & Posting Flow — ⚠️ posting writes real listings now with a real phone-verify gate; seller profile review and AI drafting still missing
  - [x] 3-step posting wizard screen (`post-ad.tsx`)
  - [ ] Seller profile + NGJA licence verification review — ⚠️ the profile _view_ is real now (`apps/mobile/app/seller/[id].tsx`, `GET /sellers/:id`: real name/location/bio/active-listings/lots-sold, reached from Listing Detail's Seller tab), but licence/office-hours/languages/payments and the review/approval side (an admin verifying a seller's NGJA licence) are still entirely unbuilt — no schema, no workflow
  - [x] Phone-verify-to-post hard gate — `PATCH /listings/:id/status {action:'submit'}` 403s with `code: 'phone_not_verified'` unless `users.phoneVerifiedAt` is set (`listings.controller.ts`); new `apps/mobile/app/verify-phone-account.tsx` lets an already-signed-in user (re-)verify via Clerk's authenticated-user API, reached from this gate's error, from Edit Profile's new "Verify now" link, or standalone; new `POST /me/sync-phone-verification` re-checks against Clerk's backend API directly (not client self-report) since the `user.updated` webhook can't reach a local dev server with no public tunnel
  - [ ] AI-drafted listings (EN + Sinhala)
  - [x] Real submission endpoint — "Publish now" calls `POST /listings`, attaches already-uploaded photos via `POST /listings/:id/photos`, then `PATCH /listings/:id/status {action:'submit'}` (draft → pending_review); inline error surfaced from the backend's own validation message on failure
- [x] **E1.6** Seller Dashboard — real status/edit/mark-sold/stats; listing promotions deliberately out of scope (see below)
  - [x] `my-ads.tsx` screen
  - [x] Real status/renew/edit/mark-sold backend — `GET /listings/mine` now joins gem/equipment details for a real spec line; status action pills call real `PATCH /listings/:id/status` (`mark_sold` already existed; `relist`/`renew` are new `STATUS_TRANSITIONS` entries added for this, both landing on `active` with a fresh 30-day `expiresAt` and triggering the same saved-search alert fan-out `approve` does); "Delete" on a still-`draft` ad is a real hard `DELETE /listings/:id`, on `pending_review`/`expired` it's the soft `remove` status action instead (hard delete only allows `draft`). Edit routes to `post-ad.tsx`'s new edit mode (`?id=`) — fetches and prefills the existing listing, locks the gem/equipment type switch (immutable after creation), shows a notice instead of the photo picker (no photo fields in `PATCH /listings/:id` yet), and on save `PATCH`es in place rather than creating a new listing — real only while `draft`/`pending_review`, matching that endpoint's own lock-after-publish rule. `removed` listings are filtered out of the list entirely.
  - [x] Per-listing views & inquiry stats — new `listings.viewCount` column, incremented on every real `GET /listings/:id` whose caller isn't that listing's own seller (a raw impression count, not unique visitors — no session/cookie layer to dedup against). "Saves" is the real `favorites` count per listing; the card's new third meta stat (the mockup's own card only had two) is how many distinct buyers have a real `inquiry_threads` row for that listing. `GET /listings/mine` now returns all three per listing via two grouped aggregate queries (not N+1); my-ads.tsx's top stat tiles sum them across the seller's own ads instead of showing "—".
  - [x] ~~Promotions picker backend~~ — dropped, not building listing boosts. The decorative "Promote" action pill was removed from `my-ads.tsx` entirely (it rendered as a non-pressable `View`, not a stubbed handler) along with its now-unused `myAds.promote` i18n key in all three dictionaries. No schema/API/design work was ever started for this.
  - [x] Deactivate/reactivate a live ad — a new `paused` value on the `listing_status` pg enum (migration `0014_uneven_ultimates.sql`, `ALTER TYPE ... ADD VALUE`), plus `deactivate: {from:['active'],to:'paused'}` / `reactivate: {from:['paused'],to:'active'}` entries in `listings.controller.ts`'s `STATUS_TRANSITIONS` — a reversible pause, distinct from `remove`'s one-way trip to `removed` (no transition exists back out of that status). Browse/search already only ever selected `status = 'active'`, so a paused listing drops out of public results for free, no query change needed. Neither action touches `expiresAt` — pausing/resuming doesn't reset or extend the existing validity window. `remove` was also extended to accept `paused` as a `from` status, so a paused ad can still be deleted outright. `my-ads.tsx`: active ads get a new secondary "Deactivate" pill next to "Mark sold"; a paused ad gets its own card state with a primary "Reactivate" pill and a secondary "Remove" (the same soft-remove confirm dialog pending/expired already use) — no confirm dialog on deactivate/reactivate itself, same as relist/renew, since it's a reversible pair. All transitions smoke-tested directly against the shared dev DB (deactivate → reactivate → re-deactivate → remove, plus confirming invalid transitions reject) before cleanup.
- [ ] **E1.7** Monetization & Billing — ❌ not started
  - [ ] Plans (Free/Dealer/Showroom), credit ledger, subscriptions
  - [ ] Stripe Billing + PayHere dual-rail checkout and webhooks
  - [ ] Dunning, invoices/receipts with VAT line
- [ ] **E1.8** Admin & Moderation Panel — ❌ not started
  - [ ] Moderation queue (cert-format, duplicate, high-value-no-cert, sanctioned-origin flags)
  - [ ] Seller verification review, reports & strikes
  - [ ] Blocked-keywords list, audit log
  - (only existing "admin" code is a one-line guard-test endpoint, `GET /me/admin-check`)
- [ ] **E1.9** Notifications — ⚠️ saved-search digests are real now; generic cross-kind fan-out still UI-only
  - [x] `NotificationsProvider` + unread badge (client-side)
  - [ ] Domain event → SQS → fan-out worker (email/push/in-app) — still needed for `enquiries`/`price_drops`, the two `notification_kind` values with no producer yet; `new_listings` no longer needs this (see below)
  - [x] Saved-search alert digests — in-app only, no email (there's no email-sending infra anywhere in this repo; the `profile.tsx` copy that implies "one summary email each week" is unconnected UI text, not a commitment). New `saved_search_matches` junction table (migration `0015_redundant_talos.sql`) replaces the old real-time per-match `notifications` insert: `recordMatchingSavedSearches` (renamed from `notifyMatchingSavedSearches`, `apps/api/src/notifications/saved-search-alerts.ts`) now records one row per `(savedSearchId, listingId)` at the same `active`-transition trigger point (`approve`/`relist`/`renew`) instead of writing a notification immediately. New `SavedSearchDigestService` (`saved-search-digest.service.ts`), a weekly `@Cron(CronExpression.EVERY_WEEK)` job (`ScheduleModule.forRoot()` was already registered app-wide for `CurrencyRatesService`/`SearchIndexService` — no new scheduling infra needed) groups pending matches by saved search, dedupes by listing (a relisted item matching the same search twice before a digest runs still counts once), writes one `notifications` row per search ("3 new matches for 'blue sapphire'" + up to 3 titles, "and N more" beyond that), then deletes the consumed `saved_search_matches` rows. A buyer now gets one weekly roundup per saved search instead of an inbox entry per listing. Smoke-tested end-to-end against the shared dev DB (two matches + a duplicate match collapsed into one 2-listing digest; a second run with nothing pending is a clean no-op) before cleanup. **Not wired further**: `profile.tsx`'s "Saved search digest" toggle is still local-only (doesn't gate this worker — every `alertsEnabled` search gets digested regardless of that toggle); `saved-searches.tsx` itself is still the pre-existing local-demo-data screen, disconnected from the real `saved_searches` API entirely (unrelated pre-existing gap, not touched here)
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

Mostly not started (correctly — Phase 1 isn't done), except the Stores directory below, built ahead of sequence at explicit request:

- [ ] **E2.1** Storefronts & Follows — ⚠️ Stores directory real; Follows not started
  - [x] Stores directory — ports "Ceylon Gem Exchange Stores.html": a new `apps/mobile/app/stores.tsx` screen, reached from a new store icon button in Home's header (left of the notifications bell). Real sellers come from a new `GET /sellers` (`apps/api/src/sellers/sellers-list.controller.ts` — any account with ≥1 active listing, grouped/counted via a single query, no rating/review fields since no review system exists anywhere in this schema), merged with the mockup's own 7 stores (`getStoreDirectory()`, `lib/listings.ts` — 6 new `SELLER_PROFILES` fixture entries added alongside the pre-existing Perera Gem House one, each a real tap-through to a fully working Seller Profile) — same "real rows + a static demo set, merged client-side" pattern favourites.tsx established. A real seller with no fixture rating renders "—" in place of stars, same fallback seller/[id].tsx's own real path already uses. Verified against a real simulator run: the header button, the merged list (gracefully fixture-only today, since the dev DB has ~0 real active listings), and a deep-link-through to a new fixture seller's profile all screenshotted and confirmed correct.
  - [ ] Follows — not started (no `follows` table, no UI affordance anywhere)
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

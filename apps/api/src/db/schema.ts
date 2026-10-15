import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  unique,
  doublePrecision,
  jsonb,
} from 'drizzle-orm/pg-core'

export const userRole = pgEnum('user_role', ['user', 'admin', 'moderator'])
export const userLocale = pgEnum('user_locale', ['en', 'si', 'ta'])
export const userStatus = pgEnum('user_status', ['active', 'suspended'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email'),
  phone: text('phone'),
  phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
  displayName: text('display_name'),
  // Edit Profile's own fields (packages/i18n's `editProfile` namespace,
  // seeded before this table had columns for any of them) — `bio`/
  // `location`/`shopName`/`publicCollectorProfile` are genuinely new,
  // added to match the Edit Profile mockup rather than ahead of it;
  // `displayName`/`phone` above already existed (synced from Clerk by the
  // webhook) and are now also user-editable directly via `PATCH /me`, not
  // just Clerk-sourced. `displayName` is the mockup's "Full Name";
  // `shopName` is its separate "Display Name / Shop" field — a seller's
  // public-facing shop name shown on listings, distinct from their real
  // name. `location` holds the mockup's "District" (one of the fixed
  // 25 Sri Lankan districts, enforced client-side by the picker sheet —
  // same reasoning as not having a DB enum for it as filterGroups' other
  // taxonomies have, since this is a free-text field on a user, not a
  // moderated listing facet). `showPhoneOnListings` defaults `true` to
  // preserve today's behavior (phone-reveal already hands out a number
  // whenever one exists) — this is what lets a seller opt *out*, checked
  // in phone-reveal.controller.ts before anything else so an opted-out
  // seller never costs a buyer rate-limit quota for a reveal that was
  // never going to return a number anyway. `publicCollectorProfile` is
  // store-only for now, same as `listingReports` — no public collector
  // profile page exists yet to gate on it.
  bio: text('bio'),
  location: text('location'),
  shopName: text('shop_name'),
  showPhoneOnListings: boolean('show_phone_on_listings').notNull().default(true),
  publicCollectorProfile: boolean('public_collector_profile').notNull().default(false),
  role: userRole('role').notNull().default('user'),
  locale: userLocale('locale').notNull().default('en'),
  status: userStatus('status').notNull().default('active'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Home's filter sheet taxonomy (Stone/Shape/District/Origin/Certificate),
// DB-backed instead of the static apps/mobile/lib/filters.ts it replaces —
// so the admin dashboard (not built yet) can add/retire options without an
// app release. `key` is a stable slug (never shown, never admin-edited —
// what the app would key stored filter picks on if that's ever persisted
// server-side); `label` is the display text the mobile app currently keys
// its local filter-sheet state on too, matching the old static object's
// shape 1:1 (see FiltersController) — see that controller for why the
// public API returns `label` as the object key, not `key`.
export const filterGroups = pgTable('filter_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  label: text('label').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const filterOptions = pgTable(
  'filter_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => filterGroups.id, { onDelete: 'cascade' }),
    value: text('value').notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.groupId, table.value)],
)

// Account Settings' Language picker, DB-backed so new languages can be
// added without an app release — same taxonomy-table shape as
// filterGroups above. `code` is a plain text column (not the `userLocale`
// pg enum `users.locale` is constrained to) so inserting a new row here
// never needs its own migration first; `userLocale` stays the hard gate on
// what `users.locale` actually accepts; a genuinely new language still
// needs that enum extended, a packages/i18n dictionary, and (if the script
// needs one) a font — this table only removes the need for an app release
// to add/reorder/retire a language the app already ships support for.
// `label` is the language's own native-script name ("සිංහල", not
// "Sinhala") — what the mockup's picker sheet actually shows.
export const languages = pgTable('languages', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Account Settings' Currency picker, DB-backed and admin-editable — same
// taxonomy-table shape as `languages` above, but unlike language this one
// needs no app-side dictionary/font to support a new row: converting and
// formatting a price only needs `symbol` + `usdRate`, both stored right
// here, so a genuinely new currency really is just an admin-panel row (see
// CurrenciesController's write endpoints), no release required. `usdRate`
// is units of this currency per 1 USD — every demo listing price
// (apps/mobile/lib/listings.ts) is authored in USD, so that's the one
// conversion the app ever does; kept live by CurrencyRatesService's
// `@Cron` sync against a forex feed (currencies/currency-rates.service.ts)
// rather than a static admin-set number — an admin edit still sticks until
// the next sync tick, since that's the same field.
export const currencies = pgTable('currencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  symbol: text('symbol').notNull(),
  usdRate: doublePrecision('usd_rate').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const listingType = pgEnum('listing_type', ['gem', 'equipment'])
export const listingStatus = pgEnum('listing_status', [
  'draft',
  'pending_review',
  'active',
  'paused',
  'expired',
  'sold',
  'removed',
])
export const equipmentCondition = pgEnum('equipment_condition', ['new', 'used', 'refurbished'])

// E1.1 Listings Core — the first real listing storage in the app; every
// listing currently shown (apps/mobile/lib/listings.ts) is static fixture
// data with no backing table. `type` picks which detail table below
// (gemDetails/equipmentDetails) the listing joins to — a 1:1 split table per
// type rather than one wide table with nullable gem-only/equipment-only
// columns, mirroring the filterGroups/filterOptions parent-child split
// already used above. Price is minor-unit (`price_amount_cents` +
// `price_currency`) per CLAUDE.md's documented money convention — the first
// table to actually implement it. `priceCurrency` references
// `currencies.code` (its stable natural key), not its uuid `id`, since
// that's the column the rest of the app already keys currency lookups on
// (see CurrenciesController).
export const listings = pgTable('listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: listingType('type').notNull(),
  status: listingStatus('status').notNull().default('draft'),
  title: text('title').notNull(),
  description: text('description'),
  priceAmountCents: integer('price_amount_cents').notNull(),
  priceCurrency: text('price_currency')
    .notNull()
    .references(() => currencies.code),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  soldAt: timestamp('sold_at', { withTimezone: true }),
  removedAt: timestamp('removed_at', { withTimezone: true }),
  // A raw impression counter, not unique visitors — incremented on every
  // `GET /listings/:id` whose caller isn't this listing's own seller (see
  // that handler's own comment), so a seller refreshing their own ad never
  // inflates it. No dedup beyond that (no session/cookie layer to dedup
  // against) — same "simple, honest, not fake" bar as my-ads.tsx's own
  // comment on why this column exists at all.
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// 1:1 with `listings` where `type = 'gem'` — `listingId` is both PK and FK
// so the relationship can't drift into 1:many. Columns mirror E1.3's
// documented search-facet list (species/carat/treatment/cert/origin/price)
// plus the display fields apps/mobile/lib/listings.ts's placeholder
// `ListingDetail` already renders (shape/colour/clarity/dimensions/cut
// grade/refractive index/cert number+date/lot number) — this table is what
// that static fixture data becomes once a real CRUD API exists on top of it.
export const gemDetails = pgTable('gem_details', {
  listingId: uuid('listing_id')
    .primaryKey()
    .references(() => listings.id, { onDelete: 'cascade' }),
  species: text('species').notNull(),
  caratWeight: doublePrecision('carat_weight').notNull(),
  shape: text('shape'),
  color: text('color'),
  clarity: text('clarity'),
  origin: text('origin'),
  treatment: text('treatment'),
  dimensions: text('dimensions'),
  cutGrade: text('cut_grade'),
  refractiveIndex: text('refractive_index'),
  certAuthority: text('cert_authority'),
  certNumber: text('cert_number'),
  certIssuedAt: timestamp('cert_issued_at', { withTimezone: true }),
  lotNumber: text('lot_number'),
})

// 1:1 with `listings` where `type = 'equipment'` — lapidary equipment
// (faceting machines, polishing wheels, dop stations, etc., per CLAUDE.md's
// "gemstones and lapidary equipment" scope). No placeholder fixture exists
// for this type yet (apps/mobile/lib/listings.ts is gem-only today), so
// these columns are a first pass rather than a port of existing UI data.
export const equipmentDetails = pgTable('equipment_details', {
  listingId: uuid('listing_id')
    .primaryKey()
    .references(() => listings.id, { onDelete: 'cascade' }),
  equipmentType: text('equipment_type').notNull(),
  brand: text('brand'),
  model: text('model'),
  condition: equipmentCondition('condition').notNull().default('used'),
  yearManufactured: integer('year_manufactured'),
  specifications: text('specifications'),
  warrantyInfo: text('warranty_info'),
})

// E1.2 Media Pipeline's storage layer — this table only records that an
// object exists in MinIO's `uploads` bucket and which listing it belongs
// to; it never stores a public URL, since the bucket is private and a GET
// URL is presigned fresh on every read (see media/listing-photos.controller
// .ts) rather than persisted and left to go stale/leak. `storageKey` is
// generated server-side at presign time (POST /media/presign, before a
// listing even exists yet — a seller picks/compresses/uploads photos
// during the posting wizard, then attaches the already-uploaded keys to
// the listing once it's created), so it's unique but otherwise opaque to
// this table. One row's `isCover` true at a time per listing is enforced
// in the controller, not a DB constraint — see attachPhoto's "unset the
// previous cover" step.
export const listingPhotos = pgTable('listing_photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull().unique(),
  isCover: boolean('is_cover').notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// E1.3 Search & Discovery's outbox — a row here means "this listing's
// Typesense document may be stale," written in the same request that
// changes a listing (create/update/status-transition, see
// listings.controller.ts's enqueueSearchReindex calls) rather than writing
// to Typesense directly inline. That split exists because a listing write
// and a Typesense write can't be one atomic transaction (they're different
// systems) — if the direct Typesense call failed, Postgres and the search
// index would silently drift apart with no record anything went wrong.
// Writing this row instead is itself a Postgres insert, so it's covered by
// the same transaction as the listing change; a separate worker
// (search/search-index.service.ts's @Cron drain) does the actual Typesense
// write afterward and only deletes the row once that succeeds — so a
// Typesense outage delays indexing instead of losing the fact that it's
// needed. No `processedAt`/status column: a row's existence *is* "pending,"
// and the drain deletes it on success, so there's nothing else to track.
export const searchOutbox = pgTable('search_outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// E1.4's "Inquiry threads" — one thread per (listing, buyer) pair, not per
// listing: several different buyers can each have their own private
// conversation with the same seller about the same listing, so the
// listing alone isn't a unique key. `sellerId` is denormalized from
// `listings.sellerId` rather than always joined through — the two
// participants of a thread shouldn't silently change if a listing were
// ever reassigned, and every current query needs "who's in this thread"
// without needing the listing row at all. The composite unique constraint
// is what makes "send a message" an upsert-the-thread-then-insert-the-
// message operation (find-or-create) instead of needing a separate
// "start a conversation" step.
export const inquiryThreads = pgTable(
  'inquiry_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    buyerId: uuid('buyer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.listingId, table.buyerId)],
)

export const inquiryMessages = pgTable('inquiry_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id')
    .notNull()
    .references(() => inquiryThreads.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// E1.4's "Favorites" — replaces the 5+ independent, never-synced local
// `Set<string>` copies of "liked" state that existed across Home/All
// Listings/Search Results/Favourites/Listing Detail (apps/mobile/lib/
// listings.ts's `defaultLikedIds`, seeded once per screen with no shared
// store — see each screen's own comment on that). One row per
// (user, listing) pair, enforced by the unique constraint, is what makes
// "favorite a listing" idempotent from the client's side — no need to
// check-then-insert, just insert and ignore a conflict.
export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.listingId)],
)

// E1.4's "Saved searches" — `pickedFilters` is jsonb (the first jsonb
// column in this schema) rather than fixed columns because it mirrors
// `apps/mobile/app/home.tsx`'s own filter-sheet state: a group-label-keyed
// map of chosen options (`Record<string, string[]>`), where the groups
// themselves come from the DB-backed `filterGroups`/`filterOptions`
// taxonomy and can grow or change — a fixed set of columns would have to
// be re-migrated every time that taxonomy does. `query`/`maxPriceCents`
// mirror that same screen's free-text search box and price-ceiling
// slider — deliberately not inventing fields (min price, sort order,
// listing type) the UI doesn't actually expose yet. `alertsEnabled` is
// the per-search toggle `saved-searches.tsx` already renders; the
// matching/delivery side of "alerts" (E1.9's "Saved-search alert digests")
// reads this flag — see `savedSearchMatches` below for how a match gets
// from "recorded" to "delivered".
export const savedSearches = pgTable('saved_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  query: text('query'),
  pickedFilters: jsonb('picked_filters').$type<Record<string, string[]>>(),
  maxPriceCents: integer('max_price_cents'),
  alertsEnabled: boolean('alerts_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Matches apps/mobile/lib/notifications.ts's existing `NotificationKind`
// union (ported here as the DB enum, snake_case) — only `new_listings` is
// actually produced anywhere yet (saved-search-digest.service.ts's weekly
// digest, fed by `savedSearchMatches` below); `enquiries`/`price_drops`
// exist in the enum and the mobile tab UI but have no real event wired to
// generate them yet (an enquiry notification needs hooking into the
// message-send flow, a price-drop one needs price-change tracking — both
// their own follow-ups, not this one). A real row replaces apps/mobile/
// lib/notifications.ts's static seed entirely; that file and its demo
// content are gone once this ships, not kept as a fallback.
export const notificationKind = pgEnum('notification_kind', [
  'enquiries',
  'price_drops',
  'new_listings',
])

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kind: notificationKind('kind').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  // Both nullable and independent of `kind` — a future `enquiries` row
  // would set `listingId` without a `savedSearchId`, for instance. Neither
  // is read back by the client today (the notification's own title/body
  // already have everything a row needs to render), but keeping the
  // originating record linked costs nothing and means a future "jump to
  // the listing/saved search" tap target doesn't need a schema change.
  listingId: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }),
  savedSearchId: uuid('saved_search_id').references(() => savedSearches.id, {
    onDelete: 'cascade',
  }),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// A pending match waiting for its weekly digest, not a notification itself
// — `recordMatchingSavedSearches` (saved-search-alerts.ts) inserts one row
// per (saved search, listing) the moment a listing transitions to `active`
// (same real-time trigger point the old per-match-notification version
// used), and `SavedSearchDigestService`'s weekly `@Cron` job is the only
// thing that ever reads this table: it groups unconsumed rows by
// `savedSearchId`, writes one summary `notifications` row per search, then
// deletes the rows it just digested. So between a match happening and the
// next Sunday, a row here is "counted but not yet told to anyone" — there
// is deliberately no real-time per-match notification anymore (replaced
// by this), so buyers get one weekly roundup per saved search instead of
// an inbox entry per listing.
export const savedSearchMatches = pgTable('saved_search_matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  savedSearchId: uuid('saved_search_id')
    .notNull()
    .references(() => savedSearches.id, { onDelete: 'cascade' }),
  listingId: uuid('listing_id')
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// E1.4's "Block-a-seller" — schema is deliberately user-to-user generic
// (`blockerId`/`blockedId`, not `buyerId`/`sellerId`) even though every
// current enforcement point only exercises the buyer-blocks-seller
// direction (`apps/api/src/blocking/`): nothing about blocking is
// inherently buyer-only (a seller blocking a problem buyer is just as
// real a future need), and a generic pair costs nothing extra today. The
// product-facing route (`/sellers/:sellerId/block`) stays seller-specific
// language since that's the only direction actually wired up. Self-block
// (`blockerId = blockedId`) is rejected in the controller, not a DB
// constraint — consistent with how every other cross-field validation in
// this schema is handled (e.g. gem/equipment detail mismatches).
export const blockedUsers = pgTable(
  'blocked_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.blockerId, table.blockedId)],
)

export const listingReportReason = pgEnum('listing_report_reason', [
  'counterfeit',
  'misleading',
  'prohibited_item',
  'scam',
  'other',
])

// Store-only, same pattern as `saved_searches.alertsEnabled` — there's no
// E1.8 moderation queue to feed this into yet, so a report just
// accumulates here for whenever that's built, rather than doing anything
// automatic (no auto-flagging a listing back to `pending_review` on N
// reports, a deliberate product decision, not a missing feature). One
// report per `(reporter, listing)` pair, upserted rather than duplicated
// — a second report from the same person just updates their
// reason/details instead of piling up near-identical rows.
export const listingReports = pgTable(
  'listing_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: listingReportReason('reason').notNull(),
    details: text('details'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.reporterId, table.listingId)],
)

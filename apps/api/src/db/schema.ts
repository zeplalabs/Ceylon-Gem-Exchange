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

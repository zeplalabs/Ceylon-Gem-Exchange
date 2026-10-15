import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { currencies, gemDetails, listings, savedSearchMatches, savedSearches } from '../db/schema'

type ListingRow = typeof listings.$inferSelect
type GemDetailsRow = typeof gemDetails.$inferSelect
type SavedSearchRow = typeof savedSearches.$inferSelect

// `pickedFilters` is keyed by filter-group *label* ("Stone", "Shape", ...),
// not the stable `key` slug — see filters.controller.ts's own comment for
// why. Only the 4 groups with a real backing column on `gem_details` are
// evaluated here; "District" has no such column (gemDetails.origin is a
// free-text string like "Ratnapura, Sri Lanka", not the same 25-value
// taxonomy district.tsx's picker uses) — same gap search.controller.ts's
// own `facet_by` list already has, so a saved search that only picked a
// District still matches on everything else rather than never matching at
// all over a dimension nothing can evaluate yet.
function matchesPickedFilters(gem: GemDetailsRow | null, picked: Record<string, string[]>) {
  const stone = picked['Stone']
  if (stone?.length && !(gem && stone.includes(gem.species))) return false
  const shape = picked['Shape']
  if (shape?.length && !(gem?.shape && shape.includes(gem.shape))) return false
  const origin = picked['Origin']
  if (origin?.length && !(gem?.origin && origin.includes(gem.origin))) return false
  const certificate = picked['Certificate']
  if (certificate?.length && !(gem?.certAuthority && certificate.includes(gem.certAuthority))) {
    return false
  }
  return true
}

// `priceUsdCents` is the listing's price converted via `currencies.usdRate`
// (live-synced, see CurrencyRatesService) — `saved_searches.maxPriceCents`
// has no currency column of its own, so this treats it as already being in
// USD, the same base unit the rest of the app's price fields (and the
// mobile fixtures' `priceUsd` naming) are implicitly denominated in.
function matchesSavedSearch(
  listing: ListingRow,
  gem: GemDetailsRow | null,
  priceUsdCents: number,
  search: SavedSearchRow,
): boolean {
  if (search.query) {
    const q = search.query.trim().toLowerCase()
    if (q && !listing.title.toLowerCase().includes(q)) return false
  }
  if (search.maxPriceCents != null && priceUsdCents > search.maxPriceCents) return false
  if (search.pickedFilters && !matchesPickedFilters(gem, search.pickedFilters)) return false
  return true
}

// Called right after a listing transitions to `active` (listings.
// controller.ts's `approve`/`relist`/`renew` status actions) — the moment
// it's genuinely a new, visible listing a buyer could actually find.
// Evaluates every `alertsEnabled` saved search against it in application
// code rather than a Typesense/SQL filter expression per search: this
// schema's filter criteria (query substring, a price cap, 4 picked-option
// lists) is simple enough that a pure function reading each saved search's
// own rows is more legible than building and round-tripping a dynamic
// query per search, at the scale (one buyer's own saved searches,
// evaluated once per newly-active listing) this actually runs at.
//
// Records matches rather than notifying immediately — one
// `saved_search_matches` row per (search, listing) — so
// `SavedSearchDigestService`'s weekly job can batch everything a search
// matched since the last digest into a single summary notification
// instead of flooding the inbox with one row per listing.
export async function recordMatchingSavedSearches(listingId: string) {
  const [row] = await db
    .select({ listing: listings, gem: gemDetails })
    .from(listings)
    .leftJoin(gemDetails, eq(gemDetails.listingId, listings.id))
    .where(eq(listings.id, listingId))
    .limit(1)
  if (!row || row.listing.status !== 'active') return

  const [currencyRow] = await db
    .select({ usdRate: currencies.usdRate })
    .from(currencies)
    .where(eq(currencies.code, row.listing.priceCurrency))
    .limit(1)
  const priceUsdCents = row.listing.priceAmountCents / (currencyRow?.usdRate ?? 1)

  const candidates = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.alertsEnabled, true))

  const matches = candidates.filter((search) =>
    matchesSavedSearch(row.listing, row.gem, priceUsdCents, search),
  )
  if (matches.length === 0) return

  await db.insert(savedSearchMatches).values(
    matches.map((search) => ({
      savedSearchId: search.id,
      listingId: row.listing.id,
    })),
  )
}

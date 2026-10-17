import { BadRequestException, Controller, Get, Query, Req } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import type { Request } from 'express'
import { getOptionalActor } from '../auth/acting-user'
import { db } from '../db/client'
import { blockedUsers, listingType } from '../db/schema'
import type { ListingDocument } from './search-index.service'
import { LISTINGS_COLLECTION, typesense } from './typesense-client'

type ListingTypeValue = (typeof listingType.enumValues)[number]

interface SearchQueryParams {
  q?: string
  type?: string
  species?: string
  shape?: string
  treatment?: string
  certAuthority?: string
  origin?: string
  equipmentType?: string
  condition?: string
  currency?: string
  minPriceCents?: string
  maxPriceCents?: string
  sort?: string
  page?: string
  perPage?: string
}

const SORT_MAP: Record<string, string> = {
  price_asc: 'priceAmountCents:asc',
  price_desc: 'priceAmountCents:desc',
  newest: 'publishedAtTs:desc',
}

// Typesense's filter_by syntax treats a bare value as a token unless
// backtick-quoted, so any facet value containing a space ("Blue Sapphire")
// or other special character breaks without this — the backtick itself
// can't appear inside a quoted value, so it's replaced rather than escaped
// (no escape sequence exists for it in this syntax).
function filterValue(value: string) {
  return `\`${value.replace(/`/g, "'")}\``
}

// Home's filter sheet lets a buyer pick more than one option within the
// same group (e.g. two "Stone" chips at once) — sent here as a
// comma-joined query param. Typesense's `field:=[a,b]` equality syntax is
// an OR match against any listed value, so a single value (the common
// case) is just the one-element-array form of the same syntax, not a
// special case.
function filterValues(field: string, raw: string) {
  const values = raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  if (values.length === 0) return null
  return `${field}:=[${values.map(filterValue).join(',')}]`
}

function clampInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = value !== undefined ? Number.parseInt(value, 10) : NaN
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.min(Math.max(parsed, min), max)
}

// Public, unauthenticated — buyers browse/search before sign-in, same as
// FiltersController/LanguagesController. Only ever searches what
// SearchIndexService has indexed, which is only ever `active` listings
// (see that service's buildDocument) — there's no separate "is this
// listing visible" check needed here the way GET /listings/:id has one,
// since a non-active listing simply has no document to find.
@Controller('search')
export class SearchController {
  @Get()
  async search(@Query() query: SearchQueryParams, @Req() request: Request) {
    if (query.type && !listingType.enumValues.includes(query.type as ListingTypeValue)) {
      throw new BadRequestException(`type must be one of: ${listingType.enumValues.join(', ')}`)
    }

    const filters: string[] = []

    // Soft auth — a bearer token is optional here (unlike every other
    // write/read-your-own-data endpoint), since search stays fully usable
    // signed out. When one *is* present, hide any listing from a seller
    // this caller has blocked (block-a-seller, apps/api/src/blocking/) —
    // this is the one enforcement point of that feature that can't be a
    // simple "reject the request" the way messages/reveal-phone are,
    // since there's no single blocked listing to reject, just some to
    // leave out.
    const actor = await getOptionalActor(request)
    if (actor) {
      const blocked = await db
        .select({ sellerId: blockedUsers.blockedId })
        .from(blockedUsers)
        .where(eq(blockedUsers.blockerId, actor.id))
      if (blocked.length > 0) {
        filters.push(`sellerId:!=[${blocked.map((b) => b.sellerId).join(',')}]`)
      }
    }
    if (query.type) filters.push(`type:=${query.type}`)
    for (const [field, raw] of [
      ['species', query.species],
      ['shape', query.shape],
      ['treatment', query.treatment],
      ['certAuthority', query.certAuthority],
      ['origin', query.origin],
      ['equipmentType', query.equipmentType],
      ['condition', query.condition],
    ] as const) {
      if (!raw) continue
      const filter = filterValues(field, raw)
      if (filter) filters.push(filter)
    }
    if (query.currency) filters.push(`priceCurrency:=${filterValue(query.currency)}`)

    const minPrice = query.minPriceCents ? Number.parseInt(query.minPriceCents, 10) : undefined
    if (minPrice !== undefined && Number.isFinite(minPrice)) {
      filters.push(`priceAmountCents:>=${minPrice}`)
    }
    const maxPrice = query.maxPriceCents ? Number.parseInt(query.maxPriceCents, 10) : undefined
    if (maxPrice !== undefined && Number.isFinite(maxPrice)) {
      filters.push(`priceAmountCents:<=${maxPrice}`)
    }

    const page = clampInt(query.page, 1, 1, 10_000)
    const perPage = clampInt(query.perPage, 20, 1, 100)

    const result = await typesense
      .collections<ListingDocument>(LISTINGS_COLLECTION)
      .documents()
      .search({
        q: query.q?.trim() || '*',
        query_by: 'title,description',
        filter_by: filters.length > 0 ? filters.join(' && ') : undefined,
        facet_by: 'type,species,shape,treatment,certAuthority,origin,equipmentType,condition',
        sort_by: SORT_MAP[query.sort ?? ''] ?? 'publishedAtTs:desc',
        page,
        per_page: perPage,
      })

    return {
      hits: (result.hits ?? []).map((hit) => hit.document),
      found: result.found,
      page: result.page,
      facets: (result.facet_counts ?? []).map((facet) => ({
        field: facet.field_name,
        counts: facet.counts.map((c) => ({ value: c.value, count: c.count })),
      })),
    }
  }
}

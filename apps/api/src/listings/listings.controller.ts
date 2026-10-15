import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { and, count, desc, eq, inArray, notInArray, sql } from 'drizzle-orm'
import type { Request } from 'express'
import { getActingUser, getOptionalActor, isModerator } from '../auth/acting-user'
import { AuthedRequest, ClerkAuthGuard } from '../auth/clerk-auth.guard'
import { db } from '../db/client'
import { recordMatchingSavedSearches } from '../notifications/saved-search-alerts'
import {
  blockedUsers,
  currencies,
  equipmentCondition,
  equipmentDetails,
  favorites,
  gemDetails,
  inquiryThreads,
  listings,
  listingStatus,
  listingType,
  users,
} from '../db/schema'
import { enqueueSearchReindex } from '../search/outbox'

type ListingTypeValue = (typeof listingType.enumValues)[number]
type ListingStatusValue = (typeof listingStatus.enumValues)[number]
type EquipmentConditionValue = (typeof equipmentCondition.enumValues)[number]

interface GemDetailsInput {
  species?: string
  caratWeight?: number
  shape?: string
  color?: string
  clarity?: string
  origin?: string
  treatment?: string
  dimensions?: string
  cutGrade?: string
  refractiveIndex?: string
  certAuthority?: string
  certNumber?: string
  certIssuedAt?: string
  lotNumber?: string
}

interface EquipmentDetailsInput {
  equipmentType?: string
  brand?: string
  model?: string
  condition?: string
  yearManufactured?: number
  specifications?: string
  warrantyInfo?: string
}

interface CreateListingBody {
  type?: string
  title?: string
  description?: string
  priceAmountCents?: number
  priceCurrency?: string
  gemDetails?: GemDetailsInput
  equipmentDetails?: EquipmentDetailsInput
}

interface UpdateListingBody {
  title?: string
  description?: string
  priceAmountCents?: number
  priceCurrency?: string
  gemDetails?: GemDetailsInput
  equipmentDetails?: EquipmentDetailsInput
}

interface StatusActionBody {
  action?: string
}

// Keyed by the action a caller requests, not the resulting status, since
// the same destination status can be reached different ways in principle
// and the action is what the caller/role-check actually gates on. Mirrors
// the flow docs/remaining-work.md's E1.1 describes: draft -> pending_review
// -> active -> expired / sold / removed. `allow: 'owner_or_moderator'` is
// only needed for `remove` — every other action is either seller-only
// (submit, mark_sold) or moderation-only (approve/reject the review queue,
// expire).
const STATUS_TRANSITIONS: Record<
  string,
  {
    from: ListingStatusValue[]
    to: ListingStatusValue
    allow: 'owner' | 'moderator' | 'owner_or_moderator'
  }
> = {
  submit: { from: ['draft'], to: 'pending_review', allow: 'owner' },
  approve: { from: ['pending_review'], to: 'active', allow: 'moderator' },
  reject: { from: ['pending_review'], to: 'draft', allow: 'moderator' },
  mark_sold: { from: ['active'], to: 'sold', allow: 'owner' },
  expire: { from: ['active'], to: 'expired', allow: 'moderator' },
  // `relist`/`renew` both take a no-longer-active listing straight back to
  // `active` (not through `pending_review` again) — the content hasn't
  // changed, there's no moderation queue UI to send it to anyway (E1.8),
  // and a seller relisting a sold item or renewing an expired one is
  // exactly the kind of low-friction action my-ads.tsx's own action pills
  // already implied before this had real backend behind it.
  relist: { from: ['sold'], to: 'active', allow: 'owner' },
  renew: { from: ['expired'], to: 'active', allow: 'owner' },
  // A seller-initiated pause, distinct from `remove` — reversible via
  // `reactivate`, and intentionally not `remove`'s one-way trip to
  // `removed` (there's no transition back out of that status). Doesn't
  // touch `expiresAt`: pausing/resuming shouldn't reset or extend the
  // existing validity window, unlike `approve`/`relist`/`renew`.
  deactivate: { from: ['active'], to: 'paused', allow: 'owner' },
  reactivate: { from: ['paused'], to: 'active', allow: 'owner' },
  remove: {
    from: ['draft', 'pending_review', 'active', 'paused'],
    to: 'removed',
    allow: 'owner_or_moderator',
  },
}

function clampInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = value !== undefined ? Number.parseInt(value, 10) : NaN
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.min(Math.max(parsed, min), max)
}

async function assertActiveCurrency(code: string) {
  const [row] = await db
    .select({ code: currencies.code })
    .from(currencies)
    .where(and(eq(currencies.code, code), eq(currencies.isActive, true)))
    .limit(1)
  if (!row) {
    throw new BadRequestException('priceCurrency must be an active currency code')
  }
}

async function findListingRow(id: string) {
  const [row] = await db
    .select({
      listing: listings,
      gem: gemDetails,
      equipment: equipmentDetails,
      sellerName: users.displayName,
    })
    .from(listings)
    .leftJoin(gemDetails, eq(gemDetails.listingId, listings.id))
    .leftJoin(equipmentDetails, eq(equipmentDetails.listingId, listings.id))
    .leftJoin(users, eq(users.id, listings.sellerId))
    .where(eq(listings.id, id))
    .limit(1)
  return row ?? null
}

// `sellerName` rides along on every shaped listing response (not just a
// seller-profile-specific endpoint, which doesn't exist) — Listing
// Detail's header and Chat's both need a name to show, and there's
// nowhere else to get it from (`sellerId` alone is an opaque FK to the
// client). Nullable — `users.displayName` is itself nullable (e.g. an
// account synced from Clerk before it was set) — callers already have to
// handle a listing with no photos yet the same way, so this isn't a new
// kind of gap for them to handle. The seller's *phone* deliberately isn't
// here — see phone-reveal/phone-reveal.controller.ts for why that's its
// own rate-limited endpoint instead of a field on this response.
function shapeListingRow(row: NonNullable<Awaited<ReturnType<typeof findListingRow>>>) {
  return {
    ...row.listing,
    sellerName: row.sellerName,
    details: row.listing.type === 'gem' ? row.gem : row.equipment,
  }
}

function assertValidCreateBody(body: CreateListingBody) {
  if (!body.type || !listingType.enumValues.includes(body.type as ListingTypeValue)) {
    throw new BadRequestException(`type must be one of: ${listingType.enumValues.join(', ')}`)
  }
  if (!body.title?.trim()) {
    throw new BadRequestException('title is required')
  }
  if (
    typeof body.priceAmountCents !== 'number' ||
    !Number.isInteger(body.priceAmountCents) ||
    body.priceAmountCents <= 0
  ) {
    throw new BadRequestException('priceAmountCents must be a positive integer')
  }
  if (!body.priceCurrency) {
    throw new BadRequestException('priceCurrency is required')
  }

  if (body.type === 'gem') {
    if (body.equipmentDetails) {
      throw new BadRequestException("equipmentDetails is not valid for a 'gem' listing")
    }
    if (!body.gemDetails?.species?.trim()) {
      throw new BadRequestException('gemDetails.species is required')
    }
    if (typeof body.gemDetails.caratWeight !== 'number' || body.gemDetails.caratWeight <= 0) {
      throw new BadRequestException('gemDetails.caratWeight must be a positive number')
    }
  } else {
    if (body.gemDetails) {
      throw new BadRequestException("gemDetails is not valid for an 'equipment' listing")
    }
    if (!body.equipmentDetails?.equipmentType?.trim()) {
      throw new BadRequestException('equipmentDetails.equipmentType is required')
    }
    if (
      body.equipmentDetails.condition !== undefined &&
      !equipmentCondition.enumValues.includes(
        body.equipmentDetails.condition as EquipmentConditionValue,
      )
    ) {
      throw new BadRequestException(
        `equipmentDetails.condition must be one of: ${equipmentCondition.enumValues.join(', ')}`,
      )
    }
  }
}

function assertValidUpdateBody(currentType: ListingTypeValue, body: UpdateListingBody) {
  if (body.title !== undefined && !body.title.trim()) {
    throw new BadRequestException('title cannot be empty')
  }
  if (
    body.priceAmountCents !== undefined &&
    (!Number.isInteger(body.priceAmountCents) || body.priceAmountCents <= 0)
  ) {
    throw new BadRequestException('priceAmountCents must be a positive integer')
  }
  if (body.gemDetails && currentType !== 'gem') {
    throw new BadRequestException("gemDetails is not valid for this listing's type")
  }
  if (body.equipmentDetails && currentType !== 'equipment') {
    throw new BadRequestException("equipmentDetails is not valid for this listing's type")
  }
  if (body.gemDetails?.species !== undefined && !body.gemDetails.species.trim()) {
    throw new BadRequestException('gemDetails.species cannot be empty')
  }
  if (
    body.gemDetails?.caratWeight !== undefined &&
    (typeof body.gemDetails.caratWeight !== 'number' || body.gemDetails.caratWeight <= 0)
  ) {
    throw new BadRequestException('gemDetails.caratWeight must be a positive number')
  }
  if (
    body.equipmentDetails?.equipmentType !== undefined &&
    !body.equipmentDetails.equipmentType.trim()
  ) {
    throw new BadRequestException('equipmentDetails.equipmentType cannot be empty')
  }
  if (
    body.equipmentDetails?.condition !== undefined &&
    !equipmentCondition.enumValues.includes(
      body.equipmentDetails.condition as EquipmentConditionValue,
    )
  ) {
    throw new BadRequestException(
      `equipmentDetails.condition must be one of: ${equipmentCondition.enumValues.join(', ')}`,
    )
  }
}

// `GET`/`GET :id` are public — buyers browse before sign-in, same as
// FiltersController/LanguagesController. Everything that creates, edits, or
// moves a listing through draft -> pending_review -> active -> expired /
// sold / removed requires ClerkAuthGuard; ownership and the moderator-only
// steps (approve/reject/expire) are checked by hand against `users.role`
// rather than RolesGuard's static @Roles(), since "the owner, OR an
// admin/moderator" isn't a fixed role list — it depends on who's asking
// about which row.
@Controller('listings')
export class ListingsController {
  @Get()
  async getListings(
    @Req() request: Request,
    @Query('type') type?: string,
    @Query('limit') limitParam?: string,
    @Query('offset') offsetParam?: string,
  ) {
    if (type !== undefined && !listingType.enumValues.includes(type as ListingTypeValue)) {
      throw new BadRequestException(`type must be one of: ${listingType.enumValues.join(', ')}`)
    }

    const limit = clampInt(limitParam, 20, 1, 100)
    const offset = clampInt(offsetParam, 0, 0, Number.MAX_SAFE_INTEGER)

    const conditions = [eq(listings.status, 'active' as ListingStatusValue)]
    if (type) {
      conditions.push(eq(listings.type, type as ListingTypeValue))
    }

    // Same soft-auth block-a-seller filtering as GET /search — see that
    // controller's own comment.
    const actor = await getOptionalActor(request)
    if (actor) {
      const blocked = await db
        .select({ sellerId: blockedUsers.blockedId })
        .from(blockedUsers)
        .where(eq(blockedUsers.blockerId, actor.id))
      if (blocked.length > 0) {
        conditions.push(
          notInArray(
            listings.sellerId,
            blocked.map((b) => b.sellerId),
          ),
        )
      }
    }

    return db
      .select()
      .from(listings)
      .where(and(...conditions))
      .orderBy(desc(listings.publishedAt))
      .limit(limit)
      .offset(offset)
  }

  // Must come before `GET :id` — otherwise Nest would match "mine" as an
  // :id path param. Joins gem/equipment details (unlike the plain `GET
  // /search`-adjacent list below, which never needed them) — my-ads.tsx
  // needs a real spec line per card, the same shape `shapeListingRow`
  // already builds for a single listing.
  @Get('mine')
  @UseGuards(ClerkAuthGuard)
  async getMyListings(@Req() request: AuthedRequest) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const rows = await db
      .select({ listing: listings, gem: gemDetails, equipment: equipmentDetails })
      .from(listings)
      .leftJoin(gemDetails, eq(gemDetails.listingId, listings.id))
      .leftJoin(equipmentDetails, eq(equipmentDetails.listingId, listings.id))
      .where(eq(listings.sellerId, actor.id))
      .orderBy(desc(listings.updatedAt))

    // Two grouped aggregate queries instead of a per-listing N+1 — this
    // seller's own ad count is small enough that grouping across all of
    // them at once (then merging in JS below) is both simpler and faster
    // than one count query per card. `favoritesCount` backs my-ads.tsx's
    // "saves" stat (the real `favorites` table, not a fake number);
    // `inquiryCount` is new — how many distinct buyers have a real thread
    // about this listing (`inquiry_threads`, one row per (listing, buyer)
    // pair already, so a plain count is already "distinct buyers", no
    // separate dedup needed).
    const listingIds = rows.map((row) => row.listing.id)
    const [favoriteCounts, inquiryCounts] =
      listingIds.length === 0
        ? [[], []]
        : await Promise.all([
            db
              .select({ listingId: favorites.listingId, value: count() })
              .from(favorites)
              .where(inArray(favorites.listingId, listingIds))
              .groupBy(favorites.listingId),
            db
              .select({ listingId: inquiryThreads.listingId, value: count() })
              .from(inquiryThreads)
              .where(inArray(inquiryThreads.listingId, listingIds))
              .groupBy(inquiryThreads.listingId),
          ])
    const favoritesByListing = new Map(favoriteCounts.map((r) => [r.listingId, r.value]))
    const inquiriesByListing = new Map(inquiryCounts.map((r) => [r.listingId, r.value]))

    return rows.map((row) => ({
      ...row.listing,
      details: row.listing.type === 'gem' ? row.gem : row.equipment,
      favoritesCount: favoritesByListing.get(row.listing.id) ?? 0,
      inquiryCount: inquiriesByListing.get(row.listing.id) ?? 0,
    }))
  }

  // Public, soft-auth (same `getOptionalActor` pattern as GET /search) —
  // the only thing auth is used for here is excluding the listing's own
  // seller from their own view count, not gating access. Incrementing
  // happens on every real load of this route regardless of who's asking
  // beyond that, including a signed-out buyer — there's no session/cookie
  // layer to dedup repeat views against, so this is a raw impression
  // count, not unique visitors (see `listings.viewCount`'s own schema
  // comment).
  @Get(':id')
  async getListing(@Param('id') id: string, @Req() request: Request) {
    const row = await findListingRow(id)
    if (!row || row.listing.status === 'removed') {
      throw new NotFoundException(`No listing with id ${id}`)
    }

    const actor = await getOptionalActor(request)
    if (actor?.id !== row.listing.sellerId) {
      await db
        .update(listings)
        .set({ viewCount: sql`${listings.viewCount} + 1` })
        .where(eq(listings.id, id))
      row.listing.viewCount += 1
    }

    return shapeListingRow(row)
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  async createListing(@Req() request: AuthedRequest, @Body() body: CreateListingBody) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }
    assertValidCreateBody(body)
    await assertActiveCurrency(body.priceCurrency!)

    const listingId = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(listings)
        .values({
          sellerId: actor.id,
          type: body.type as ListingTypeValue,
          title: body.title!.trim(),
          description: body.description?.trim() || null,
          priceAmountCents: body.priceAmountCents!,
          priceCurrency: body.priceCurrency!,
        })
        .returning({ id: listings.id })
      const listing = rows[0]!

      if (body.type === 'gem') {
        const g = body.gemDetails!
        await tx.insert(gemDetails).values({
          listingId: listing.id,
          species: g.species!.trim(),
          caratWeight: g.caratWeight!,
          shape: g.shape?.trim() || null,
          color: g.color?.trim() || null,
          clarity: g.clarity?.trim() || null,
          origin: g.origin?.trim() || null,
          treatment: g.treatment?.trim() || null,
          dimensions: g.dimensions?.trim() || null,
          cutGrade: g.cutGrade?.trim() || null,
          refractiveIndex: g.refractiveIndex?.trim() || null,
          certAuthority: g.certAuthority?.trim() || null,
          certNumber: g.certNumber?.trim() || null,
          certIssuedAt: g.certIssuedAt ? new Date(g.certIssuedAt) : null,
          lotNumber: g.lotNumber?.trim() || null,
        })
      } else {
        const e = body.equipmentDetails!
        await tx.insert(equipmentDetails).values({
          listingId: listing.id,
          equipmentType: e.equipmentType!.trim(),
          brand: e.brand?.trim() || null,
          model: e.model?.trim() || null,
          condition: (e.condition as EquipmentConditionValue) || 'used',
          yearManufactured: e.yearManufactured ?? null,
          specifications: e.specifications?.trim() || null,
          warrantyInfo: e.warrantyInfo?.trim() || null,
        })
      }

      return listing.id
    })

    // Won't actually make it into Typesense until `submit`/`approve`
    // (buildDocument skips anything not `active`) — enqueued anyway so the
    // outbox drain's upsert-or-delete logic is the single place that
    // decides indexability, rather than every write site needing to know
    // which statuses matter.
    await enqueueSearchReindex(listingId)

    return shapeListingRow((await findListingRow(listingId))!)
  }

  @Patch(':id')
  @UseGuards(ClerkAuthGuard)
  async updateListing(
    @Req() request: AuthedRequest,
    @Param('id') id: string,
    @Body() body: UpdateListingBody,
  ) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const row = await findListingRow(id)
    if (!row) {
      throw new NotFoundException(`No listing with id ${id}`)
    }
    const { listing } = row

    if (listing.sellerId !== actor.id && !isModerator(actor.role)) {
      throw new ForbiddenException('Not the owner of this listing')
    }
    if (listing.status !== 'draft' && listing.status !== 'pending_review') {
      throw new ConflictException(`Cannot edit a listing with status "${listing.status}"`)
    }
    assertValidUpdateBody(listing.type, body)
    if (body.priceCurrency) {
      await assertActiveCurrency(body.priceCurrency)
    }

    await db.transaction(async (tx) => {
      await tx
        .update(listings)
        .set({
          ...(body.title !== undefined && { title: body.title.trim() }),
          ...(body.description !== undefined && { description: body.description.trim() || null }),
          ...(body.priceAmountCents !== undefined && { priceAmountCents: body.priceAmountCents }),
          ...(body.priceCurrency !== undefined && { priceCurrency: body.priceCurrency }),
          updatedAt: new Date(),
        })
        .where(eq(listings.id, id))

      if (body.gemDetails) {
        const g = body.gemDetails
        await tx
          .update(gemDetails)
          .set({
            ...(g.species !== undefined && { species: g.species.trim() }),
            ...(g.caratWeight !== undefined && { caratWeight: g.caratWeight }),
            ...(g.shape !== undefined && { shape: g.shape?.trim() || null }),
            ...(g.color !== undefined && { color: g.color?.trim() || null }),
            ...(g.clarity !== undefined && { clarity: g.clarity?.trim() || null }),
            ...(g.origin !== undefined && { origin: g.origin?.trim() || null }),
            ...(g.treatment !== undefined && { treatment: g.treatment?.trim() || null }),
            ...(g.dimensions !== undefined && { dimensions: g.dimensions?.trim() || null }),
            ...(g.cutGrade !== undefined && { cutGrade: g.cutGrade?.trim() || null }),
            ...(g.refractiveIndex !== undefined && {
              refractiveIndex: g.refractiveIndex?.trim() || null,
            }),
            ...(g.certAuthority !== undefined && {
              certAuthority: g.certAuthority?.trim() || null,
            }),
            ...(g.certNumber !== undefined && { certNumber: g.certNumber?.trim() || null }),
            ...(g.certIssuedAt !== undefined && {
              certIssuedAt: g.certIssuedAt ? new Date(g.certIssuedAt) : null,
            }),
            ...(g.lotNumber !== undefined && { lotNumber: g.lotNumber?.trim() || null }),
          })
          .where(eq(gemDetails.listingId, id))
      }

      if (body.equipmentDetails) {
        const e = body.equipmentDetails
        await tx
          .update(equipmentDetails)
          .set({
            ...(e.equipmentType !== undefined && { equipmentType: e.equipmentType.trim() }),
            ...(e.brand !== undefined && { brand: e.brand?.trim() || null }),
            ...(e.model !== undefined && { model: e.model?.trim() || null }),
            ...(e.condition !== undefined && { condition: e.condition as EquipmentConditionValue }),
            ...(e.yearManufactured !== undefined && { yearManufactured: e.yearManufactured }),
            ...(e.specifications !== undefined && {
              specifications: e.specifications?.trim() || null,
            }),
            ...(e.warrantyInfo !== undefined && { warrantyInfo: e.warrantyInfo?.trim() || null }),
          })
          .where(eq(equipmentDetails.listingId, id))
      }
    })
    await enqueueSearchReindex(id)

    return shapeListingRow((await findListingRow(id))!)
  }

  @Patch(':id/status')
  @UseGuards(ClerkAuthGuard)
  async transitionListingStatus(
    @Req() request: AuthedRequest,
    @Param('id') id: string,
    @Body() body: StatusActionBody,
  ) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const action = body.action ?? ''
    const rule = STATUS_TRANSITIONS[action]
    if (!rule) {
      throw new BadRequestException(
        `action must be one of: ${Object.keys(STATUS_TRANSITIONS).join(', ')}`,
      )
    }

    const row = await findListingRow(id)
    if (!row) {
      throw new NotFoundException(`No listing with id ${id}`)
    }
    const { listing } = row

    const isOwner = listing.sellerId === actor.id
    const allowed =
      rule.allow === 'owner'
        ? isOwner
        : rule.allow === 'moderator'
          ? isModerator(actor.role)
          : isOwner || isModerator(actor.role)
    if (!allowed) {
      throw new ForbiddenException(`Not allowed to perform "${action}" on this listing`)
    }

    // Phone-verify-to-post hard gate (docs/remaining-work.md's E1.5 item)
    // — a seller can't submit a listing for review until their own phone
    // is verified. Reads straight off `users.phoneVerifiedAt` rather than
    // calling Clerk's API here (unlike `syncPhoneVerification` below,
    // which exists specifically to keep that column current in local dev
    // where the webhook can't reach this server) — this check should stay
    // fast on every submit attempt, not round-trip to Clerk each time.
    // `code: 'phone_not_verified'` is a stable value for the mobile client
    // to match on and route to verify-phone-account.tsx, rather than
    // string-matching the message.
    if (action === 'submit') {
      const [sellerRow] = await db
        .select({ phoneVerifiedAt: users.phoneVerifiedAt })
        .from(users)
        .where(eq(users.id, actor.id))
        .limit(1)
      if (!sellerRow?.phoneVerifiedAt) {
        throw new ForbiddenException({
          message: 'Verify your phone number before publishing a listing',
          code: 'phone_not_verified',
        })
      }
    }

    if (!rule.from.includes(listing.status)) {
      throw new ConflictException(
        `Cannot "${action}" a listing with status "${listing.status}" (expected one of: ${rule.from.join(', ')})`,
      )
    }

    const now = new Date()
    // `approve` also stamps a 30-day `expiresAt` — the only point in the
    // flow a validity window gets set; there's no cron sweeping expired
    // listings yet (that's its own follow-up), so this just records when
    // one *would* expire.
    const extra: Partial<typeof listings.$inferInsert> = {}
    if (action === 'approve' || action === 'relist' || action === 'renew') {
      extra.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      // `publishedAt` only stamps once, on the real first approval — a
      // relist/renew is re-activating the same listing, not newly
      // publishing it, so this leaves that date alone rather than
      // resetting "listed 2 months ago" back to "just now" (my-ads.tsx's
      // own `ad.posted` field reads off this).
      if (action === 'approve') extra.publishedAt = now
      // A relisted item isn't sold anymore — clear the stamp it left
      // `active` with. `renew` has nothing analogous to clear: `expire`
      // never sets `removedAt` (only `remove` does), so an expired
      // listing never had one to begin with.
      if (action === 'relist') extra.soldAt = null
    }
    if (action === 'mark_sold') {
      extra.soldAt = now
    }
    if (action === 'remove') {
      extra.removedAt = now
    }

    const [updated] = await db
      .update(listings)
      .set({ status: rule.to, updatedAt: now, ...extra })
      .where(eq(listings.id, id))
      .returning()
    await enqueueSearchReindex(id)

    // Best-effort — a bug in saved-search matching shouldn't fail the
    // actual status change above, which already succeeded. Any transition
    // that lands on `active` is a listing newly visible to buyers again,
    // not just the moderator-only `approve` path — a relisted or renewed
    // item is just as real a "new match" as a freshly approved one. This
    // only records the match (`saved_search_matches`) — delivery is the
    // weekly `SavedSearchDigestService` job, not this request.
    if (rule.to === 'active') {
      await recordMatchingSavedSearches(id).catch(() => {})
    }

    return updated
  }

  // Hard delete — intentionally only reachable while still a draft (never
  // shown to anyone else yet), so this can't destroy a listing a buyer may
  // already be looking at. A published listing goes through the `remove`
  // status action above instead, which keeps the row (and its inquiry/
  // view history, once those exist) rather than erasing it.
  @Delete(':id')
  @UseGuards(ClerkAuthGuard)
  async deleteListing(@Req() request: AuthedRequest, @Param('id') id: string) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const row = await findListingRow(id)
    if (!row) {
      throw new NotFoundException(`No listing with id ${id}`)
    }
    const { listing } = row

    if (listing.sellerId !== actor.id && !isModerator(actor.role)) {
      throw new ForbiddenException('Not the owner of this listing')
    }
    if (listing.status !== 'draft') {
      throw new ConflictException(
        'Only a draft listing can be deleted — remove a published one instead',
      )
    }

    await db.delete(listings).where(eq(listings.id, id))
    return { deleted: true }
  }
}

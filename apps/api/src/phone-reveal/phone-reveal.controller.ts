import {
  Controller,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { getActingUser } from '../auth/acting-user'
import { AuthedRequest, ClerkAuthGuard } from '../auth/clerk-auth.guard'
import { isBlocked } from '../blocking/is-blocked'
import { db } from '../db/client'
import { listings, users } from '../db/schema'
import { redis } from '../redis/client'

// How many *distinct* listings' phone numbers a buyer can reveal per
// rolling hour — the actual anti-scraping control. Deliberately counts
// distinct listings, not reveal requests: see revealedKey below, a repeat
// reveal of a listing already unlocked this buyer never consumes budget
// again, so re-visiting a listing (e.g. reopening Chat) can't throttle a
// buyer via their own past activity. A plain env-var default, not a DB
// row — this is runtime-tunable ops config, not product data an admin UI
// would ever need to edit.
const REVEAL_LIMIT_PER_HOUR = Number(process.env.PHONE_REVEAL_LIMIT_PER_HOUR ?? 20)
const WINDOW_SECONDS = 60 * 60
// How long a reveal "sticks" before it would count against quota again —
// generous on purpose (a day, not an hour) since the point is never
// re-penalizing genuine repeat interest, only capping fresh reveals.
const REVEALED_TTL_SECONDS = 60 * 60 * 24

function countKey(buyerId: string) {
  // Fixed-window bucket keyed by the current hour since the epoch — counts
  // reset at the top of each hour rather than 60 minutes after a buyer's
  // first reveal. Simpler than a sliding window and precise enough for an
  // anti-scraping control (not a billing meter).
  const hourBucket = Math.floor(Date.now() / 1000 / WINDOW_SECONDS)
  return `phone-reveal-count:${buyerId}:${hourBucket}`
}

function revealedKey(buyerId: string, listingId: string) {
  return `phone-reveal:${buyerId}:${listingId}`
}

// Separate from ListingsController — this is the one endpoint in the app
// whose entire reason to exist is withholding a field (`users.phone`) that
// GET /listings/:id deliberately no longer includes (see that endpoint's
// own comment). Nested under /listings/:id the same way messages/photos
// are, for the same reason: always reached from a specific listing, never
// a bare id.
@Controller('listings/:listingId/reveal-phone')
export class PhoneRevealController {
  @Post()
  @UseGuards(ClerkAuthGuard)
  async reveal(@Req() request: AuthedRequest, @Param('listingId') listingId: string) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const rows = await db
      .select({
        sellerId: listings.sellerId,
        status: listings.status,
        sellerPhone: users.phone,
        showPhoneOnListings: users.showPhoneOnListings,
      })
      .from(listings)
      .leftJoin(users, eq(users.id, listings.sellerId))
      .where(eq(listings.id, listingId))
      .limit(1)
    const listing = rows[0]
    if (!listing || listing.status === 'removed') {
      throw new NotFoundException(`No listing with id ${listingId}`)
    }

    // The seller can always see their own number — nothing to protect
    // them from, and no reason to spend their own rate-limit budget on it.
    if (listing.sellerId !== actor.id) {
      if (await isBlocked(actor.id, listing.sellerId)) {
        throw new ForbiddenException("You've blocked this seller")
      }
      // A seller who's opted out (Edit Profile's "Show phone number on my
      // listings" toggle) never had a number to give out in the first
      // place — checked before the rate-limit logic below so a reveal
      // that was never going to return anything doesn't cost the buyer
      // any quota.
      if (!listing.showPhoneOnListings) {
        return { phone: null }
      }

      const alreadyRevealed = await redis.exists(revealedKey(actor.id, listingId))
      if (!alreadyRevealed) {
        const key = countKey(actor.id)
        const count = await redis.incr(key)
        if (count === 1) {
          await redis.expire(key, WINDOW_SECONDS)
        }
        if (count > REVEAL_LIMIT_PER_HOUR) {
          throw new HttpException(
            `Too many phone reveals — try again in under an hour (limit: ${REVEAL_LIMIT_PER_HOUR}/hour)`,
            HttpStatus.TOO_MANY_REQUESTS,
          )
        }
        await redis.set(revealedKey(actor.id, listingId), '1', 'EX', REVEALED_TTL_SECONDS)
      }
    }

    return { phone: listing.sellerPhone }
  }
}

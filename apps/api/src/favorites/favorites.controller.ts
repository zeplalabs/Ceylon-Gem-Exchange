import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common'
import { and, desc, eq, ne } from 'drizzle-orm'
import { getActingUser } from '../auth/acting-user'
import { AuthedRequest, ClerkAuthGuard } from '../auth/clerk-auth.guard'
import { db } from '../db/client'
import { equipmentDetails, favorites, gemDetails, listings } from '../db/schema'

// Replaces apps/mobile/app/favourites.tsx's local `liked` set filtered
// against the static `featuredListings` fixture — this is the real list,
// one row per listing the caller has favorited (see
// listing-favorite.controller.ts for the toggle). A listing that was
// later `removed` is excluded, same visibility rule GET /listings/:id
// uses, but *not* excluded for expired/sold — a buyer likely still wants
// to see "this one I liked sold," not have it silently vanish.
//
// Joins gem/equipment details and shapes a `details` field the exact same
// way `GET /listings/mine` does (listings.controller.ts's `getMyListings`)
// — favourites.tsx needs a real spec line for its `ListingCard`s, same as
// my-ads.tsx does, not just the bare listing row.
@Controller('favorites')
export class FavoritesController {
  @Get()
  @UseGuards(ClerkAuthGuard)
  async getFavorites(@Req() request: AuthedRequest) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const rows = await db
      .select({
        favoritedAt: favorites.createdAt,
        listing: listings,
        gem: gemDetails,
        equipment: equipmentDetails,
      })
      .from(favorites)
      .innerJoin(listings, eq(listings.id, favorites.listingId))
      .leftJoin(gemDetails, eq(gemDetails.listingId, listings.id))
      .leftJoin(equipmentDetails, eq(equipmentDetails.listingId, listings.id))
      .where(and(eq(favorites.userId, actor.id), ne(listings.status, 'removed')))
      .orderBy(desc(favorites.createdAt))

    return rows.map((row) => ({
      ...row.listing,
      details: row.listing.type === 'gem' ? row.gem : row.equipment,
      favoritedAt: row.favoritedAt,
    }))
  }
}

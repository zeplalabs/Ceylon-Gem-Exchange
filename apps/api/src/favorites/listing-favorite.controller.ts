import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { getActingUser } from '../auth/acting-user'
import { AuthedRequest, ClerkAuthGuard } from '../auth/clerk-auth.guard'
import { db } from '../db/client'
import { favorites, listings } from '../db/schema'

// Nested under /listings/:listingId/favorite rather than a flat
// /favorites/:id — same reasoning as photos/messages/reveal-phone: a
// buyer always arrives at this from a specific listing (the heart button
// on Listing Detail, Home, etc.), and it needs to double as "is this
// listing already favorited," which only makes sense scoped to a listing.
// The favorited-listings *list* (GET /favorites) is the flat resource —
// see favorites.controller.ts.
@Controller('listings/:listingId/favorite')
export class ListingFavoriteController {
  @Get()
  @UseGuards(ClerkAuthGuard)
  async getStatus(@Req() request: AuthedRequest, @Param('listingId') listingId: string) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const [row] = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, actor.id), eq(favorites.listingId, listingId)))
      .limit(1)
    return { favorited: !!row }
  }

  // Idempotent — the composite unique constraint on (userId, listingId)
  // plus onConflictDoNothing means the client can call this on every tap
  // without first checking GET's result, and a double-tap (e.g. a fast
  // retry) can't create two rows or error.
  @Post()
  @UseGuards(ClerkAuthGuard)
  async favorite(@Req() request: AuthedRequest, @Param('listingId') listingId: string) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const [listing] = await db
      .select({ id: listings.id, status: listings.status })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1)
    if (!listing || listing.status === 'removed') {
      throw new NotFoundException(`No listing with id ${listingId}`)
    }

    await db
      .insert(favorites)
      .values({ userId: actor.id, listingId })
      .onConflictDoNothing({ target: [favorites.userId, favorites.listingId] })

    return { favorited: true }
  }

  @Delete()
  @UseGuards(ClerkAuthGuard)
  async unfavorite(@Req() request: AuthedRequest, @Param('listingId') listingId: string) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, actor.id), eq(favorites.listingId, listingId)))
    return { favorited: false }
  }
}

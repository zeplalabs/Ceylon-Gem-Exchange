import { Controller, Get } from '@nestjs/common'
import { count, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { listings, users } from '../db/schema'

// `GET /sellers` — the real-data half of the Stores directory
// (apps/mobile/app/stores.tsx); the other half is that screen's own
// static demo fixture (STORE_LIST, lib/listings.ts), merged client-side,
// same "real rows + static fixture, never just one" pattern favourites.tsx
// just established. Only returns a seller once they actually have a
// listing live (`activeListingsCount > 0`) — an account with zero active
// listings isn't a browsable "store" yet. No rating/review fields here,
// same reasoning as seller-profile.controller.ts's own comment: there's no
// review system backing that column anywhere in this schema.
@Controller('sellers')
export class SellersListController {
  @Get()
  async listSellers() {
    const rows = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        shopName: users.shopName,
        location: users.location,
        activeListingsCount: count(listings.id),
      })
      .from(users)
      .innerJoin(listings, eq(listings.sellerId, users.id))
      .where(eq(listings.status, 'active'))
      .groupBy(users.id)
      .orderBy(desc(count(listings.id)))

    return rows
  }
}

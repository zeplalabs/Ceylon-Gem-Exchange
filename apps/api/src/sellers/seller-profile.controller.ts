import { Controller, Get, NotFoundException, Param } from '@nestjs/common'
import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { equipmentDetails, gemDetails, listings, users } from '../db/schema'

// Public, unauthenticated — browsing a seller's profile (apps/mobile/app/
// seller/[id].tsx) works the same signed out as browsing a listing does.
// `lotsSold`/`activeListingsCount` are real counts; everything else the
// Storefront mockup shows beyond what's returned here (star rating,
// reviews, reply time, cover/logo/gallery photos, shop hours/address
// beyond `location`) has no backing column anywhere in this schema yet —
// that's its own follow-up ("Seller profile + NGJA licence verification
// review" in docs/remaining-work.md), not silently faked here. The client
// renders those as fixed, clearly-demo trim around this real data, same
// reasoning as my-membership.tsx's entirely-demo billing state. `listings`
// is joined with gem/equipment details — same pattern as `GET
// /listings/mine`/`GET /favorites` — so the storefront's own stone grid
// can show a real spec line and (for gem listings) a real species-based
// category breakdown, not just a bare title/price.
@Controller('sellers/:id')
export class SellerProfileController {
  @Get()
  async getProfile(@Param('id') id: string) {
    const [seller] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        shopName: users.shopName,
        location: users.location,
        bio: users.bio,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    if (!seller) {
      throw new NotFoundException(`No seller with id ${id}`)
    }

    const [[activeRow], [soldRow], activeListingRows] = await Promise.all([
      db
        .select({ value: count() })
        .from(listings)
        .where(and(eq(listings.sellerId, id), eq(listings.status, 'active'))),
      db
        .select({ value: count() })
        .from(listings)
        .where(and(eq(listings.sellerId, id), eq(listings.status, 'sold'))),
      db
        .select({ listing: listings, gem: gemDetails, equipment: equipmentDetails })
        .from(listings)
        .leftJoin(gemDetails, eq(gemDetails.listingId, listings.id))
        .leftJoin(equipmentDetails, eq(equipmentDetails.listingId, listings.id))
        .where(and(eq(listings.sellerId, id), eq(listings.status, 'active')))
        .orderBy(desc(listings.publishedAt)),
    ])

    return {
      ...seller,
      activeListingsCount: activeRow?.value ?? 0,
      lotsSold: soldRow?.value ?? 0,
      listings: activeListingRows.map((row) => ({
        ...row.listing,
        details: row.listing.type === 'gem' ? row.gem : row.equipment,
      })),
    }
  }
}

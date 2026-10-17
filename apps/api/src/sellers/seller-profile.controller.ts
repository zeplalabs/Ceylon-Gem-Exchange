import { Controller, Get, NotFoundException, Param } from '@nestjs/common'
import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { equipmentDetails, gemDetails, listings, users } from '../db/schema'

// Public, unauthenticated — browsing a seller's profile (apps/mobile/app/
// seller/[id].tsx) works the same signed out as browsing a listing does.
// Backs two different client layouts off the same response: a `shopName`
// seller renders the Storefront (cover/address/gallery), one with no
// `shopName` renders the simpler individual-seller Profile (ports "Ceylon
// Gem Exchange User Profile.html") — `shopName`'s own presence/absence is
// the entire "has a storefront" test, no separate flag needed.
// `lotsSold`/`activeListingsCount`/`phoneVerifiedAt` are real;
// everything else either mockup shows beyond what's returned here (star
// rating, reviews, reply time, cover/logo/gallery photos, "Verified ID",
// languages, last-active, shop hours/address beyond `location`) has no
// backing column anywhere in this schema yet — that's its own follow-up
// ("Seller profile + NGJA licence verification review" /
// "Review system" in docs/remaining-work.md), not silently faked here.
// The client renders those as fixed, clearly-demo trim around this real
// data (Storefront path only — the Profile path just omits a row/section
// entirely when it has nothing real to show, same bar `lotsSold`/rating
// already hold elsewhere). `listings`/`soldListings` are both joined with
// gem/equipment details — same pattern as `GET /listings/mine`/`GET
// /favorites` — so either grid can show a real spec line and (for gem
// listings) a real species-based category breakdown, not just a bare
// title/price.
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
        phoneVerifiedAt: users.phoneVerifiedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    if (!seller) {
      throw new NotFoundException(`No seller with id ${id}`)
    }

    const [[activeRow], [soldRow], activeListingRows, soldListingRows] = await Promise.all([
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
        // Newest-created first — the storefront's stone grid shows a
        // "Newest" sort label (apps/mobile/app/seller/[id].tsx) with no
        // other sort mode to switch to yet, so this is the one order that
        // needs to actually hold. `createdAt` (not `publishedAt`, which
        // only moves on `approve` and stays frozen through relist/renew)
        // so a relisted older item doesn't jump back to the top.
        .orderBy(desc(listings.createdAt)),
      db
        .select({ listing: listings, gem: gemDetails, equipment: equipmentDetails })
        .from(listings)
        .leftJoin(gemDetails, eq(gemDetails.listingId, listings.id))
        .leftJoin(equipmentDetails, eq(equipmentDetails.listingId, listings.id))
        .where(and(eq(listings.sellerId, id), eq(listings.status, 'sold')))
        // The individual-seller Profile's own "Previously sold" grid —
        // most recently sold first.
        .orderBy(desc(listings.soldAt)),
    ])

    return {
      ...seller,
      activeListingsCount: activeRow?.value ?? 0,
      lotsSold: soldRow?.value ?? 0,
      listings: activeListingRows.map((row) => ({
        ...row.listing,
        details: row.listing.type === 'gem' ? row.gem : row.equipment,
      })),
      soldListings: soldListingRows.map((row) => ({
        ...row.listing,
        details: row.listing.type === 'gem' ? row.gem : row.equipment,
      })),
    }
  }
}

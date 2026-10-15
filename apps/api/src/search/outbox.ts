import { db } from '../db/client'
import { searchOutbox } from '../db/schema'

// Called from listings.controller.ts after any write that could change
// whether/how a listing should appear in search — create, edit, or a
// status transition. A plain function (not a Nest provider) deliberately,
// same reasoning as db/client.ts's module-level singleton: nothing here
// needs DI, and listings.controller.ts already imports other modules'
// plain exports directly (e.g. auth/acting-user.ts) rather than going
// through Nest's module graph for a one-line helper.
export async function enqueueSearchReindex(listingId: string) {
  await db.insert(searchOutbox).values({ listingId })
}

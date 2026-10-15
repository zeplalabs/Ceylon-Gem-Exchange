import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { blockedUsers } from '../db/schema'

// Shared by every enforcement point (inquiries, phone-reveal, search,
// listings) so "has A blocked B" is one query, not reimplemented per
// feature. Direction matters — `isBlocked(buyerId, sellerId)` is not the
// same check as `isBlocked(sellerId, buyerId)`, since blocking isn't
// symmetric (see blockedUsers' own schema comment).
export async function isBlocked(blockerId: string, blockedId: string) {
  const [row] = await db
    .select({ id: blockedUsers.id })
    .from(blockedUsers)
    .where(and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId)))
    .limit(1)
  return !!row
}

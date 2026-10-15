import { verifyToken } from '@clerk/backend'
import { eq } from 'drizzle-orm'
import type { Request } from 'express'
import { extractBearerToken } from './clerk-auth.guard'
import { db } from '../db/client'
import { users } from '../db/schema'
import type { Role } from './roles.decorator'

// Resolves the internal `users` row (id + role) for the Clerk-authenticated
// caller — every write endpoint that checks "is this the owner, or a
// moderator" (listings, listing photos) needs this same lookup, so it
// lives here once instead of being copy-pasted per controller.
export async function getActingUser(clerkId: string) {
  const [row] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)
  return row ?? null
}

export function isModerator(role: Role) {
  return role === 'admin' || role === 'moderator'
}

// Best-effort identification for an otherwise-public route (today, just
// GET /search and GET /listings) that still needs to know "who's asking"
// when it can — specifically to filter out blocked sellers' listings for
// a signed-in buyer (see blocking/) without making the route itself
// require sign-in the way ClerkAuthGuard would. Any failure (no header,
// expired/invalid token, no matching `users` row yet) just resolves to
// `null` — "treat as anonymous" — rather than throwing, since the caller
// never promised to be signed in here.
export async function getOptionalActor(request: Request) {
  const token = extractBearerToken(request.headers.authorization)
  if (!token) return null

  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
    return await getActingUser(payload.sub)
  } catch {
    return null
  }
}

import { createClerkClient } from '@clerk/backend'
import { config } from 'dotenv'

// Same env-loading caveat as db/client.ts: this module can be reached via
// a static import chain that gets evaluated before Nest's
// ConfigModule.forRoot() runs, so CLERK_SECRET_KEY can't be relied on
// without loading it ourselves — confirmed by a real failure
// (`createClerkClient` reading `undefined`, which doesn't error until the
// first actual API call) when this was first tested standalone via `tsx`
// rather than through Nest's bootstrap. Unlike `verifyToken`'s own calls
// elsewhere (clerk-auth.guard.ts, acting-user.ts), which read
// `process.env.CLERK_SECRET_KEY` fresh inside each request handler and so
// never hit this race, a module-level client instance only reads it once,
// at import time.
config({ path: '../../.env' })

// Only needed for calls that act *on* Clerk (today: deleting a user for
// DELETE /me) — everything else so far only verifies tokens
// (`verifyToken`, a standalone function, not this client) or reacts to
// Clerk's own webhook events. A single module-level instance, same
// singleton convention as db/client.ts/media/s3-client.ts/redis/client.ts.
export const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

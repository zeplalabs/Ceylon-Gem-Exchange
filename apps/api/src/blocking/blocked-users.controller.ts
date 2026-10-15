import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import { getActingUser } from '../auth/acting-user'
import { AuthedRequest, ClerkAuthGuard } from '../auth/clerk-auth.guard'
import { db } from '../db/client'
import { blockedUsers, users } from '../db/schema'

// The flat counterpart to seller-block.controller.ts's nested toggle —
// for a "Blocked sellers" management screen, listing everyone the caller
// has blocked (name only; nothing here assumes the blocked user has any
// listings, same reasoning as that controller's own comment).
@Controller('blocked-users')
export class BlockedUsersController {
  @Get()
  @UseGuards(ClerkAuthGuard)
  async list(@Req() request: AuthedRequest) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const rows = await db
      .select({
        id: blockedUsers.blockedId,
        name: users.displayName,
        blockedAt: blockedUsers.createdAt,
      })
      .from(blockedUsers)
      .innerJoin(users, eq(users.id, blockedUsers.blockedId))
      .where(eq(blockedUsers.blockerId, actor.id))
      .orderBy(desc(blockedUsers.createdAt))

    return rows
  }
}

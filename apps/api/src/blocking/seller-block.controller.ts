import {
  BadRequestException,
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
import { blockedUsers, users } from '../db/schema'
import { isBlocked } from './is-blocked'

// Nested under /sellers/:sellerId/block — product-facing language even
// though the schema underneath is user-generic (see blockedUsers' own
// comment). `sellerId` here is just a `users.id`; nothing checks the
// target actually has any listings, since blocking "a seller" in this app
// is really "a person I don't want contact from," listings or not.
@Controller('sellers/:sellerId/block')
export class SellerBlockController {
  @Get()
  @UseGuards(ClerkAuthGuard)
  async getStatus(@Req() request: AuthedRequest, @Param('sellerId') sellerId: string) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }
    return { blocked: await isBlocked(actor.id, sellerId) }
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  async block(@Req() request: AuthedRequest, @Param('sellerId') sellerId: string) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }
    if (sellerId === actor.id) {
      throw new BadRequestException("Can't block yourself")
    }

    const [target] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, sellerId))
      .limit(1)
    if (!target) {
      throw new NotFoundException(`No user with id ${sellerId}`)
    }

    await db
      .insert(blockedUsers)
      .values({ blockerId: actor.id, blockedId: sellerId })
      .onConflictDoNothing({ target: [blockedUsers.blockerId, blockedUsers.blockedId] })

    return { blocked: true }
  }

  @Delete()
  @UseGuards(ClerkAuthGuard)
  async unblock(@Req() request: AuthedRequest, @Param('sellerId') sellerId: string) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    await db
      .delete(blockedUsers)
      .where(and(eq(blockedUsers.blockerId, actor.id), eq(blockedUsers.blockedId, sellerId)))
    return { blocked: false }
  }
}

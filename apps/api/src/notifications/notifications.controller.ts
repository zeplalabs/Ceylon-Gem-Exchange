import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { getActingUser } from '../auth/acting-user'
import { AuthedRequest, ClerkAuthGuard } from '../auth/clerk-auth.guard'
import { db } from '../db/client'
import { notifications } from '../db/schema'

// Backs apps/mobile/providers/NotificationsProvider.tsx + app/notifications.tsx
// (Home's bell badge and the inbox screen) — replaces the static
// apps/mobile/lib/notifications.ts seed entirely. Only ever contains
// `new_listings` rows in practice right now (see saved-search-alerts.ts);
// `enquiries`/`price_drops` are real enum values with no producer wired
// up yet, same reasoning as that file's own comment.
@Controller('me/notifications')
export class NotificationsController {
  @Get()
  @UseGuards(ClerkAuthGuard)
  async list(@Req() request: AuthedRequest) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, actor.id))
      .orderBy(desc(notifications.createdAt))
  }

  @Patch(':id/read')
  @UseGuards(ClerkAuthGuard)
  async markRead(@Req() request: AuthedRequest, @Param('id') id: string) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const [existing] = await db
      .select({ userId: notifications.userId })
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1)
    if (!existing || existing.userId !== actor.id) {
      throw new NotFoundException(`No notification with id ${id}`)
    }

    const [row] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning()
    return row
  }

  @Patch('read-all')
  @UseGuards(ClerkAuthGuard)
  async markAllRead(@Req() request: AuthedRequest) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, actor.id), isNull(notifications.readAt)))
    return { updated: true }
  }
}

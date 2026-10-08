import { BadRequestException, Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { ClerkAuthGuard, AuthedRequest } from './clerk-auth.guard'
import { Roles } from './roles.decorator'
import { RolesGuard } from './roles.guard'
import { db } from '../db/client'
import { users, userLocale } from '../db/schema'

@Controller('me')
export class MeController {
  // Returns the DB-persisted `locale` (null if this Clerk user has no row
  // yet, e.g. the webhook hasn't synced it and they've never called
  // PATCH /me either) — lets a sign-in on a new device/reinstall adopt the
  // language they'd previously chosen, instead of only ever seeing the
  // device-detected guess. See providers/LocaleProvider.tsx +
  // hooks/useSyncDeviceLocale.ts on the mobile side for how this is used.
  @Get()
  @UseGuards(ClerkAuthGuard)
  async getMe(@Req() request: AuthedRequest) {
    const [row] = await db
      .select({ locale: users.locale })
      .from(users)
      .where(eq(users.clerkId, request.auth.sub))

    return { clerkUserId: request.auth.sub, locale: row?.locale ?? null }
  }

  @Get('admin-check')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  getAdminCheck(@Req() request: AuthedRequest) {
    return { clerkUserId: request.auth.sub, ok: true }
  }

  // Lets the client push a detected/chosen locale before the webhook has
  // necessarily synced the user row yet — upserts rather than assuming the
  // row already exists.
  @Patch()
  @UseGuards(ClerkAuthGuard)
  async updateMe(@Req() request: AuthedRequest, @Body() body: { locale?: string }) {
    if (body.locale === undefined) {
      return { updated: false }
    }

    if (!userLocale.enumValues.includes(body.locale as (typeof userLocale.enumValues)[number])) {
      throw new BadRequestException(`locale must be one of: ${userLocale.enumValues.join(', ')}`)
    }
    const locale = body.locale as (typeof userLocale.enumValues)[number]

    await db
      .insert(users)
      .values({ clerkId: request.auth.sub, locale })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: { locale, updatedAt: new Date() },
      })

    return { updated: true }
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { and, count, eq } from 'drizzle-orm'
import { getActingUser } from './acting-user'
import { clerkClient } from './clerk-client'
import { ClerkAuthGuard, AuthedRequest } from './clerk-auth.guard'
import { Roles } from './roles.decorator'
import { RolesGuard } from './roles.guard'
import { db } from '../db/client'
import { favorites, listings, savedSearches, users, userLocale } from '../db/schema'

interface UpdateMeBody {
  locale?: string
  displayName?: string
  phone?: string
  email?: string
  bio?: string
  location?: string
  shopName?: string
  showPhoneOnListings?: boolean
  publicCollectorProfile?: boolean
}

@Controller('me')
export class MeController {
  // Returns the DB-persisted profile fields (all null if this Clerk user
  // has no row yet — the webhook hasn't synced it and they've never
  // called PATCH /me either). `locale` alone lets a sign-in on a new
  // device/reinstall adopt the language they'd previously chosen, instead
  // of only ever seeing the device-detected guess (see
  // providers/LocaleProvider.tsx + hooks/useSyncDeviceLocale.ts); the rest
  // is what Edit Profile reads to pre-fill its form.
  @Get()
  @UseGuards(ClerkAuthGuard)
  async getMe(@Req() request: AuthedRequest) {
    const [row] = await db
      .select({
        locale: users.locale,
        displayName: users.displayName,
        phone: users.phone,
        phoneVerifiedAt: users.phoneVerifiedAt,
        email: users.email,
        bio: users.bio,
        location: users.location,
        shopName: users.shopName,
        showPhoneOnListings: users.showPhoneOnListings,
        publicCollectorProfile: users.publicCollectorProfile,
      })
      .from(users)
      .where(eq(users.clerkId, request.auth.sub))

    return {
      clerkUserId: request.auth.sub,
      locale: row?.locale ?? null,
      displayName: row?.displayName ?? null,
      phone: row?.phone ?? null,
      phoneVerified: row?.phoneVerifiedAt != null,
      email: row?.email ?? null,
      bio: row?.bio ?? null,
      location: row?.location ?? null,
      shopName: row?.shopName ?? null,
      showPhoneOnListings: row?.showPhoneOnListings ?? true,
      publicCollectorProfile: row?.publicCollectorProfile ?? false,
    }
  }

  @Get('admin-check')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  getAdminCheck(@Req() request: AuthedRequest) {
    return { clerkUserId: request.auth.sub, ok: true }
  }

  // Every field is optional and independently settable — a caller patches
  // whichever subset changed (locale alone, from useSyncDeviceLocale; the
  // whole form, from Edit Profile), upserting rather than assuming the row
  // already exists, same reasoning as the original locale-only version of
  // this endpoint had.
  @Patch()
  @UseGuards(ClerkAuthGuard)
  async updateMe(@Req() request: AuthedRequest, @Body() body: UpdateMeBody) {
    if (body.locale !== undefined) {
      if (!userLocale.enumValues.includes(body.locale as (typeof userLocale.enumValues)[number])) {
        throw new BadRequestException(`locale must be one of: ${userLocale.enumValues.join(', ')}`)
      }
    }
    if (body.displayName !== undefined && !body.displayName.trim()) {
      throw new BadRequestException('displayName cannot be empty')
    }

    const changingPhone = body.phone !== undefined

    await db
      .insert(users)
      .values({
        clerkId: request.auth.sub,
        ...(body.locale !== undefined && {
          locale: body.locale as (typeof userLocale.enumValues)[number],
        }),
        ...(body.displayName !== undefined && { displayName: body.displayName.trim() }),
        ...(body.phone !== undefined && { phone: body.phone.trim() || null }),
        ...(body.email !== undefined && { email: body.email.trim() || null }),
        ...(body.bio !== undefined && { bio: body.bio.trim() || null }),
        ...(body.location !== undefined && { location: body.location.trim() || null }),
        ...(body.shopName !== undefined && { shopName: body.shopName.trim() || null }),
        ...(body.showPhoneOnListings !== undefined && {
          showPhoneOnListings: body.showPhoneOnListings,
        }),
        ...(body.publicCollectorProfile !== undefined && {
          publicCollectorProfile: body.publicCollectorProfile,
        }),
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          ...(body.locale !== undefined && {
            locale: body.locale as (typeof userLocale.enumValues)[number],
          }),
          ...(body.displayName !== undefined && { displayName: body.displayName.trim() }),
          ...(body.phone !== undefined && { phone: body.phone.trim() || null }),
          ...(body.email !== undefined && { email: body.email.trim() || null }),
          ...(body.bio !== undefined && { bio: body.bio.trim() || null }),
          ...(body.location !== undefined && { location: body.location.trim() || null }),
          ...(body.shopName !== undefined && { shopName: body.shopName.trim() || null }),
          ...(body.showPhoneOnListings !== undefined && {
            showPhoneOnListings: body.showPhoneOnListings,
          }),
          ...(body.publicCollectorProfile !== undefined && {
            publicCollectorProfile: body.publicCollectorProfile,
          }),
          // A phone edited here didn't just go through OTP verification —
          // clear the verified-at stamp rather than let an unverified
          // number keep reading as verified. Only the webhook (a real
          // Clerk-side verification event) ever sets this field again.
          ...(changingPhone && { phoneVerifiedAt: null }),
          updatedAt: new Date(),
        },
      })

    return { updated: true }
  }

  // Called right after a client-side Clerk phone verification succeeds
  // (verify-phone-account.tsx, reached from the Phone-verify-to-post hard
  // gate below) — re-fetches the user directly from Clerk's own backend
  // API and writes `phoneVerifiedAt` from *that*, not from the client's
  // own say-so. This exists because the normal sync path (webhooks/
  // clerk-webhook.controller.ts's `user.updated` handler) depends on
  // Clerk actually being able to reach this API, which a local dev server
  // behind no public tunnel never receives — without this, a real,
  // successful verification would still leave `phoneVerifiedAt` null
  // forever in local dev. Trusting Clerk's own backend API (not the
  // request body) keeps this safe to call unauthenticated-of-truth: a
  // caller can't just claim "I'm verified," only trigger a real check.
  @Post('sync-phone-verification')
  @UseGuards(ClerkAuthGuard)
  async syncPhoneVerification(@Req() request: AuthedRequest) {
    const clerkUser = await clerkClient.users.getUser(request.auth.sub)
    const verified = clerkUser.primaryPhoneNumber?.verification?.status === 'verified'

    await db
      .insert(users)
      .values({
        clerkId: request.auth.sub,
        phone: clerkUser.primaryPhoneNumber?.phoneNumber ?? null,
        phoneVerifiedAt: verified ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          phone: clerkUser.primaryPhoneNumber?.phoneNumber ?? null,
          phoneVerifiedAt: verified ? new Date() : null,
          updatedAt: new Date(),
        },
      })

    return { phoneVerified: verified }
  }

  // Backs Delete Account's "here's what you'll lose" list with real counts
  // instead of the mockup's static numbers — active listings (not every
  // status; a draft/expired/sold/removed ad isn't "active"), favorited
  // gems, and saved searches. No enquiry-thread or membership count here:
  // this app has no per-thread "enquiry count" concept worth surfacing
  // (Chat shows a running conversation, not a tally) and membership is
  // still entirely demo-only (see my-membership.tsx) — both render as
  // fixed copy on the screen itself rather than a number from here.
  @Get('deletion-impact')
  @UseGuards(ClerkAuthGuard)
  async getDeletionImpact(@Req() request: AuthedRequest) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      return { activeListings: 0, savedGems: 0, savedSearches: 0 }
    }

    const [[listingRow], [favoriteRow], [savedSearchRow]] = await Promise.all([
      db
        .select({ value: count() })
        .from(listings)
        .where(and(eq(listings.sellerId, actor.id), eq(listings.status, 'active'))),
      db.select({ value: count() }).from(favorites).where(eq(favorites.userId, actor.id)),
      db.select({ value: count() }).from(savedSearches).where(eq(savedSearches.userId, actor.id)),
    ])

    return {
      activeListings: listingRow?.value ?? 0,
      savedGems: favoriteRow?.value ?? 0,
      savedSearches: savedSearchRow?.value ?? 0,
    }
  }

  // Deletes the Clerk user first (the source of truth for identity) — its
  // own `user.deleted` webhook (webhooks/clerk-webhook.controller.ts)
  // would eventually hard-delete + cascade this row too, but this also
  // deletes it directly so the caller gets an immediate, synchronous
  // result instead of depending on webhook delivery timing; the webhook's
  // own delete-where-clerkId becomes a no-op backstop (0 rows) whenever it
  // arrives; Clerk's cascade through `onDelete: 'cascade'` on every
  // `users.id`-referencing table (listings, favorites, blocked_users,
  // inquiry_threads, etc.) handles the rest.
  @Delete()
  @UseGuards(ClerkAuthGuard)
  async deleteMe(@Req() request: AuthedRequest) {
    await clerkClient.users.deleteUser(request.auth.sub)
    await db.delete(users).where(eq(users.clerkId, request.auth.sub))
    return { deleted: true }
  }
}

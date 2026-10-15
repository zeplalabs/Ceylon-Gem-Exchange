import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { desc, eq } from 'drizzle-orm'
import { getActingUser } from '../auth/acting-user'
import { AuthedRequest, ClerkAuthGuard } from '../auth/clerk-auth.guard'
import { db } from '../db/client'
import { savedSearches } from '../db/schema'

interface SavedSearchBody {
  name?: string
  query?: string
  pickedFilters?: Record<string, string[]>
  maxPriceCents?: number
  alertsEnabled?: boolean
}

function assertValidPrice(maxPriceCents: number | undefined) {
  if (maxPriceCents !== undefined && (!Number.isInteger(maxPriceCents) || maxPriceCents <= 0)) {
    throw new BadRequestException('maxPriceCents must be a positive integer')
  }
}

// A flat, fully private resource — every route here is scoped to the
// caller's own rows (`userId = actor.id`), never another user's. A saved
// search belonging to someone else is treated as not existing at all
// (NotFoundException, not ForbiddenException) specifically so a stranger
// probing ids can't even confirm one exists — unlike listings, this isn't
// semi-public data. The matching/alerting side of a saved search (E1.9's
// "Saved-search alert digests") doesn't exist yet; this is purely
// store/retrieve for what `apps/mobile/app/saved-searches.tsx` and
// `home.tsx`'s filter sheet already let a buyer configure locally.
@Controller('saved-searches')
export class SavedSearchesController {
  @Get()
  @UseGuards(ClerkAuthGuard)
  async list(@Req() request: AuthedRequest) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    return db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, actor.id))
      .orderBy(desc(savedSearches.createdAt))
  }

  @Post()
  @UseGuards(ClerkAuthGuard)
  async create(@Req() request: AuthedRequest, @Body() body: SavedSearchBody) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }
    if (!body.name?.trim()) {
      throw new BadRequestException('name is required')
    }
    assertValidPrice(body.maxPriceCents)

    const [row] = await db
      .insert(savedSearches)
      .values({
        userId: actor.id,
        name: body.name.trim(),
        query: body.query?.trim() || null,
        pickedFilters: body.pickedFilters ?? null,
        maxPriceCents: body.maxPriceCents ?? null,
        alertsEnabled: body.alertsEnabled ?? true,
      })
      .returning()

    return row
  }

  @Patch(':id')
  @UseGuards(ClerkAuthGuard)
  async update(
    @Req() request: AuthedRequest,
    @Param('id') id: string,
    @Body() body: SavedSearchBody,
  ) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }
    if (body.name !== undefined && !body.name.trim()) {
      throw new BadRequestException('name cannot be empty')
    }
    assertValidPrice(body.maxPriceCents)

    const [existing] = await db
      .select({ userId: savedSearches.userId })
      .from(savedSearches)
      .where(eq(savedSearches.id, id))
      .limit(1)
    if (!existing || existing.userId !== actor.id) {
      throw new NotFoundException(`No saved search with id ${id}`)
    }

    const [row] = await db
      .update(savedSearches)
      .set({
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.query !== undefined && { query: body.query.trim() || null }),
        ...(body.pickedFilters !== undefined && { pickedFilters: body.pickedFilters }),
        ...(body.maxPriceCents !== undefined && { maxPriceCents: body.maxPriceCents }),
        ...(body.alertsEnabled !== undefined && { alertsEnabled: body.alertsEnabled }),
        updatedAt: new Date(),
      })
      .where(eq(savedSearches.id, id))
      .returning()

    return row
  }

  @Delete(':id')
  @UseGuards(ClerkAuthGuard)
  async remove(@Req() request: AuthedRequest, @Param('id') id: string) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const [existing] = await db
      .select({ userId: savedSearches.userId })
      .from(savedSearches)
      .where(eq(savedSearches.id, id))
      .limit(1)
    if (!existing || existing.userId !== actor.id) {
      throw new NotFoundException(`No saved search with id ${id}`)
    }

    await db.delete(savedSearches).where(eq(savedSearches.id, id))
    return { deleted: true }
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { and, asc, eq } from 'drizzle-orm'
import { getActingUser } from '../auth/acting-user'
import { AuthedRequest, ClerkAuthGuard } from '../auth/clerk-auth.guard'
import { isBlocked } from '../blocking/is-blocked'
import { db } from '../db/client'
import { inquiryMessages, inquiryThreads, listings } from '../db/schema'

interface SendMessageBody {
  body?: string
}

async function findListingOr404(listingId: string) {
  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1)
  if (!listing || listing.status === 'removed') {
    throw new NotFoundException(`No listing with id ${listingId}`)
  }
  return listing
}

// Buyer-only for now, by design, not an oversight: a seller has
// potentially many buyers each with their own private thread about the
// same listing, so "GET this listing's messages" has no single answer for
// a seller the way it does for a buyer (exactly one thread — theirs).
// There's no seller-side inbox screen yet to pick a specific thread from
// either (apps/mobile's screen list has no such screen), so a thread-
// scoped endpoint (`GET /threads/:threadId/messages`) is left for whenever
// that's built, rather than guessing at a shape nothing consumes yet.
//
// Nested under /listings/:listingId/messages rather than a flat
// /threads/:id — same reasoning as listing-photos.controller.ts: a buyer
// always arrives at this from a specific listing (apps/mobile's Chat
// screen is reached from Listing Detail's "Chat" button), never a bare
// thread id.
@Controller('listings/:listingId/messages')
export class InquiriesController {
  @Get()
  @UseGuards(ClerkAuthGuard)
  async getMessages(@Req() request: AuthedRequest, @Param('listingId') listingId: string) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const listing = await findListingOr404(listingId)
    if (listing.sellerId === actor.id) {
      throw new BadRequestException(
        "Sellers can't view their own listing's inquiries this way yet — a seller inbox isn't built",
      )
    }

    const [thread] = await db
      .select()
      .from(inquiryThreads)
      .where(and(eq(inquiryThreads.listingId, listingId), eq(inquiryThreads.buyerId, actor.id)))
      .limit(1)
    if (!thread) {
      return { thread: null, messages: [] }
    }

    const messages = await db
      .select()
      .from(inquiryMessages)
      .where(eq(inquiryMessages.threadId, thread.id))
      .orderBy(asc(inquiryMessages.createdAt))

    return { thread, messages }
  }

  // Finds-or-creates the (listing, buyer) thread — see inquiryThreads'
  // schema comment for why that composite key means a buyer's first
  // message both starts the conversation and sends it, with no separate
  // "create a thread" step the client has to orchestrate.
  @Post()
  @UseGuards(ClerkAuthGuard)
  async sendMessage(
    @Req() request: AuthedRequest,
    @Param('listingId') listingId: string,
    @Body() body: SendMessageBody,
  ) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }
    if (!body.body?.trim()) {
      throw new BadRequestException('body is required')
    }

    const listing = await findListingOr404(listingId)
    if (listing.sellerId === actor.id) {
      throw new BadRequestException("Sellers can't message themselves about their own listing")
    }
    if (await isBlocked(actor.id, listing.sellerId)) {
      throw new ForbiddenException("You've blocked this seller")
    }

    const [thread] = await db
      .insert(inquiryThreads)
      .values({ listingId, buyerId: actor.id, sellerId: listing.sellerId })
      .onConflictDoUpdate({
        target: [inquiryThreads.listingId, inquiryThreads.buyerId],
        set: { updatedAt: new Date() },
      })
      .returning()

    const [message] = await db
      .insert(inquiryMessages)
      .values({ threadId: thread!.id, senderId: actor.id, body: body.body.trim() })
      .returning()

    return { thread, message }
  }
}

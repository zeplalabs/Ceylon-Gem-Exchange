import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common'
import { desc, eq, inArray } from 'drizzle-orm'
import { getActingUser } from '../auth/acting-user'
import { AuthedRequest, ClerkAuthGuard } from '../auth/clerk-auth.guard'
import { db } from '../db/client'
import { inquiryMessages, inquiryThreads, listings, users } from '../db/schema'

// Backs the Chats inbox screen (apps/mobile/app/chats.tsx) — every real
// thread the signed-in user has started as a buyer, newest-active first.
// Buyer-only, same deliberate scope boundary as inquiries.controller.ts's
// own GET (no seller inbox screen exists yet to list a seller's many
// per-listing threads from — this endpoint doesn't return threads where
// the caller is the seller). No unread count: there's no per-user
// "last read" marker on a thread anywhere in this schema yet, so rather
// than fabricate one, this only reports who sent the last message
// (`lastMessage.fromMe`) — the client shows a read-receipt for the
// caller's own last message and nothing for an incoming one, instead of
// a number it can't actually back.
@Controller('me/inquiries')
export class MyInquiriesController {
  @Get()
  @UseGuards(ClerkAuthGuard)
  async list(@Req() request: AuthedRequest) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }

    const threads = await db
      .select({
        threadId: inquiryThreads.id,
        updatedAt: inquiryThreads.updatedAt,
        listingId: listings.id,
        listingTitle: listings.title,
        sellerName: users.displayName,
      })
      .from(inquiryThreads)
      .innerJoin(listings, eq(listings.id, inquiryThreads.listingId))
      .innerJoin(users, eq(users.id, inquiryThreads.sellerId))
      .where(eq(inquiryThreads.buyerId, actor.id))
      .orderBy(desc(inquiryThreads.updatedAt))

    if (threads.length === 0) {
      return []
    }

    // One query for every thread's messages, reduced to "last per thread"
    // in JS rather than a per-thread query — this list is always one
    // buyer's own threads (realistically a handful), the same scale
    // reasoning other list endpoints in this app already rely on (e.g.
    // favorites.controller.ts's single join rather than N+1 lookups).
    const messages = await db
      .select()
      .from(inquiryMessages)
      .where(
        inArray(
          inquiryMessages.threadId,
          threads.map((t) => t.threadId),
        ),
      )
      .orderBy(desc(inquiryMessages.createdAt))

    const lastMessageByThread = new Map<string, (typeof messages)[number]>()
    for (const message of messages) {
      if (!lastMessageByThread.has(message.threadId)) {
        lastMessageByThread.set(message.threadId, message)
      }
    }

    return threads.map((thread) => {
      const last = lastMessageByThread.get(thread.threadId)
      return {
        threadId: thread.threadId,
        listingId: thread.listingId,
        listingTitle: thread.listingTitle,
        sellerName: thread.sellerName,
        updatedAt: thread.updatedAt,
        lastMessage: last
          ? { body: last.body, fromMe: last.senderId === actor.id, createdAt: last.createdAt }
          : null,
      }
    })
  }
}

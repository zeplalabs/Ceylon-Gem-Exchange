import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { getActingUser } from '../auth/acting-user'
import { AuthedRequest, ClerkAuthGuard } from '../auth/clerk-auth.guard'
import { db } from '../db/client'
import { listingReportReason, listingReports, listings } from '../db/schema'
import { eq } from 'drizzle-orm'

type ReportReasonValue = (typeof listingReportReason.enumValues)[number]

interface ReportListingBody {
  reason?: string
  details?: string
}

// Store-only — see listingReports' own schema comment for why this
// doesn't do anything automatic (no moderation queue exists yet to feed,
// no auto-flagging). One per (reporter, listing) pair: a second report
// from the same person updates their reason/details via upsert rather
// than creating a duplicate row.
@Controller('listings/:listingId/reports')
export class ListingReportsController {
  @Post()
  @UseGuards(ClerkAuthGuard)
  async report(
    @Req() request: AuthedRequest,
    @Param('listingId') listingId: string,
    @Body() body: ReportListingBody,
  ) {
    const actor = await getActingUser(request.auth.sub)
    if (!actor) {
      throw new ForbiddenException('No user record for this account yet')
    }
    if (
      !body.reason ||
      !listingReportReason.enumValues.includes(body.reason as ReportReasonValue)
    ) {
      throw new BadRequestException(
        `reason must be one of: ${listingReportReason.enumValues.join(', ')}`,
      )
    }

    const [listing] = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1)
    if (!listing) {
      throw new NotFoundException(`No listing with id ${listingId}`)
    }

    const [row] = await db
      .insert(listingReports)
      .values({
        listingId,
        reporterId: actor.id,
        reason: body.reason as ReportReasonValue,
        details: body.details?.trim() || null,
      })
      .onConflictDoUpdate({
        target: [listingReports.reporterId, listingReports.listingId],
        set: {
          reason: body.reason as ReportReasonValue,
          details: body.details?.trim() || null,
          updatedAt: new Date(),
        },
      })
      .returning()

    return row
  }
}

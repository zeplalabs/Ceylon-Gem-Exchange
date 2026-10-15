import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../db/client'
import { listings, notifications, savedSearchMatches, savedSearches } from '../db/schema'

// The only consumer of `saved_search_matches` (see that table's own schema
// comment) — everything `recordMatchingSavedSearches` (saved-search-
// alerts.ts) has written since the last run is batched here into one
// summary `notifications` row per saved search, then the consumed rows
// are deleted. Runs weekly (Sunday 00:00, `CronExpression.EVERY_WEEK`) —
// `@nestjs/schedule`'s `ScheduleModule.forRoot()` is already registered
// app-wide for CurrencyRatesService/SearchIndexService's own `@Cron`
// jobs, so this needs no new scheduling infra.
@Injectable()
export class SavedSearchDigestService {
  private readonly logger = new Logger(SavedSearchDigestService.name)

  @Cron(CronExpression.EVERY_WEEK)
  async runDigest() {
    const pending = await db
      .select({
        matchId: savedSearchMatches.id,
        savedSearchId: savedSearchMatches.savedSearchId,
        listingId: savedSearchMatches.listingId,
        userId: savedSearches.userId,
        searchName: savedSearches.name,
        listingTitle: listings.title,
      })
      .from(savedSearchMatches)
      .innerJoin(savedSearches, eq(savedSearches.id, savedSearchMatches.savedSearchId))
      .innerJoin(listings, eq(listings.id, savedSearchMatches.listingId))

    if (pending.length === 0) return

    interface Group {
      userId: string
      name: string
      // Keyed by listingId — the same listing can produce more than one
      // `saved_search_matches` row for one search (e.g. approved, then
      // sold and relisted, before a digest ever runs); it should still
      // only count/appear once in that search's summary.
      listingTitles: Map<string, string>
    }
    const bySearch = new Map<string, Group>()
    for (const row of pending) {
      let group = bySearch.get(row.savedSearchId)
      if (!group) {
        group = { userId: row.userId, name: row.searchName, listingTitles: new Map() }
        bySearch.set(row.savedSearchId, group)
      }
      group.listingTitles.set(row.listingId, row.listingTitle)
    }

    const rows = Array.from(bySearch.entries()).map(([savedSearchId, group]) => {
      const titles = Array.from(group.listingTitles.values())
      const shown = titles.slice(0, 3)
      const body =
        titles.length > shown.length
          ? `${shown.join(', ')}, and ${titles.length - shown.length} more`
          : shown.join(', ')
      return {
        userId: group.userId,
        kind: 'new_listings' as const,
        title: `${titles.length} new match${titles.length === 1 ? '' : 'es'} for "${group.name}"`,
        body,
        savedSearchId,
      }
    })

    await db.insert(notifications).values(rows)
    await db.delete(savedSearchMatches).where(
      inArray(
        savedSearchMatches.id,
        pending.map((row) => row.matchId),
      ),
    )

    this.logger.log(`Sent ${rows.length} saved-search digest(s) for ${pending.length} match(es)`)
  }
}

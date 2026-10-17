import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../db/client'
import { equipmentDetails, gemDetails, listings, searchOutbox } from '../db/schema'
import { ensureListingsCollection, LISTINGS_COLLECTION, typesense } from './typesense-client'

export interface ListingDocument {
  id: string
  type: 'gem' | 'equipment'
  title: string
  description?: string
  species?: string
  shape?: string
  caratWeight?: number
  treatment?: string
  certAuthority?: string
  origin?: string
  equipmentType?: string
  condition?: string
  priceAmountCents: number
  priceCurrency: string
  sellerId: string
  publishedAtTs: number
}

// Returns null for anything that shouldn't be in the search index right
// now (not `active`, or gone entirely) — callers treat null as "delete
// this id from Typesense if it's there" rather than "error."
async function buildDocument(listingId: string): Promise<ListingDocument | null> {
  const rows = await db
    .select({ listing: listings, gem: gemDetails, equipment: equipmentDetails })
    .from(listings)
    .leftJoin(gemDetails, eq(gemDetails.listingId, listings.id))
    .leftJoin(equipmentDetails, eq(equipmentDetails.listingId, listings.id))
    .where(eq(listings.id, listingId))
    .limit(1)
  const row = rows[0]
  if (!row || row.listing.status !== 'active') return null

  const { listing, gem, equipment } = row
  return {
    id: listing.id,
    type: listing.type,
    title: listing.title,
    description: listing.description ?? undefined,
    species: gem?.species ?? undefined,
    shape: gem?.shape ?? undefined,
    caratWeight: gem?.caratWeight ?? undefined,
    treatment: gem?.treatment ?? undefined,
    certAuthority: gem?.certAuthority ?? undefined,
    origin: gem?.origin ?? undefined,
    equipmentType: equipment?.equipmentType ?? undefined,
    condition: equipment?.condition ?? undefined,
    priceAmountCents: listing.priceAmountCents,
    priceCurrency: listing.priceCurrency,
    sellerId: listing.sellerId,
    publishedAtTs: Math.floor((listing.publishedAt ?? listing.createdAt).getTime() / 1000),
  }
}

async function deleteDocument(listingId: string) {
  await typesense
    .collections<ListingDocument>(LISTINGS_COLLECTION)
    .documents(listingId)
    .delete()
    .catch(() => {
      // Already absent (never indexed, or a previous delete already got
      // it) — not an error worth logging.
    })
}

// E1.3 Search & Discovery's indexer — see search_outbox's own schema
// comment for why this drains a queue instead of writing to Typesense
// inline from listings.controller.ts.
@Injectable()
export class SearchIndexService implements OnModuleInit {
  private readonly logger = new Logger(SearchIndexService.name)

  async onModuleInit() {
    await ensureListingsCollection()
    await this.fullReindex()
  }

  // Every 10s is "fast enough that a seller doesn't wonder where their
  // just-approved listing went," not a hard latency guarantee — the
  // nightly full reindex below is what actually guarantees correctness.
  @Cron(CronExpression.EVERY_10_SECONDS)
  async drainOutbox() {
    const pending = await db.select().from(searchOutbox)
    if (pending.length === 0) return

    const listingIds = [...new Set(pending.map((p) => p.listingId))]
    const succeeded: string[] = []

    for (const listingId of listingIds) {
      try {
        const doc = await buildDocument(listingId)
        if (doc) {
          await typesense.collections<ListingDocument>(LISTINGS_COLLECTION).documents().upsert(doc)
        } else {
          await deleteDocument(listingId)
        }
        succeeded.push(listingId)
      } catch (err) {
        // Left in the outbox — retried next tick, and caught regardless
        // by the nightly full reindex if every retry keeps failing.
        this.logger.warn(`Failed to sync listing ${listingId} to Typesense: ${String(err)}`)
      }
    }

    if (succeeded.length > 0) {
      await db.delete(searchOutbox).where(inArray(searchOutbox.listingId, succeeded))
    }
  }

  // Re-syncs every `active` listing from Postgres (the source of truth)
  // and removes any Typesense document that isn't backed by one — the
  // backstop for whatever the outbox drain above missed (a tick that kept
  // failing, a direct DB edit, etc.), not the normal indexing path.
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async fullReindex() {
    const activeListings = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.status, 'active'))
    const activeIds = new Set(activeListings.map((l) => l.id))

    const docs = (await Promise.all(activeListings.map((l) => buildDocument(l.id)))).filter(
      (doc): doc is ListingDocument => doc !== null,
    )
    if (docs.length > 0) {
      await typesense
        .collections<ListingDocument>(LISTINGS_COLLECTION)
        .documents()
        .import(docs, { action: 'upsert' })
    }

    const staleIds = await this.findIndexedIdsNotIn(activeIds)
    for (const id of staleIds) {
      await deleteDocument(id)
    }

    this.logger.log(
      `Full reindex: ${docs.length} active listings indexed, ${staleIds.length} stale documents removed`,
    )
  }

  private async findIndexedIdsNotIn(keepIds: Set<string>) {
    const stale: string[] = []
    const perPage = 250
    for (let page = 1; ; page += 1) {
      const result = await typesense
        .collections<ListingDocument>(LISTINGS_COLLECTION)
        .documents()
        .search({
          q: '*',
          query_by: 'title',
          per_page: perPage,
          page,
        })
      const hits = result.hits ?? []
      for (const hit of hits) {
        if (!keepIds.has(hit.document.id)) stale.push(hit.document.id)
      }
      if (hits.length < perPage) break
    }
    return stale
  }
}

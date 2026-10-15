import Typesense from 'typesense'
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections'

// Points at the local Typesense container from docker-compose.yml — same
// TYPESENSE_* vars that service already reads, no new env vars needed.
export const typesense = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST ?? 'localhost',
      port: Number(process.env.TYPESENSE_PORT ?? 8108),
      protocol: 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY ?? 'ceylon_gems_dev_key',
  connectionTimeoutSeconds: 5,
})

export const LISTINGS_COLLECTION = 'listings'

// Only `active` listings ever get a document here — draft/pending_review/
// sold/expired/removed are deliberately never indexed, so "it's in
// Typesense" and "a buyer can find it" are the same fact. Field choices are
// E1.3's own documented facet list (species/carat/treatment/cert/origin/
// price) plus the equipment equivalents (equipmentType/condition), since
// this one collection indexes both listing types side by side rather than
// two separate collections — a buyer-facing "stone or equipment" split
// (the Step 1 toggle in post-ad.tsx) isn't a reason to also split the
// search index, and most fields besides `type` itself are `optional` for
// exactly that reason (gem-only or equipment-only). `publishedAtTs` is a
// plain unix seconds int — Typesense sorts/ranges numerically, it has no
// native timestamp type — and doubles as `default_sorting_field` so an
// unsorted search still returns newest-first rather than relevance-only.
export const LISTINGS_SCHEMA: CollectionCreateSchema = {
  name: LISTINGS_COLLECTION,
  fields: [
    { name: 'id', type: 'string' },
    { name: 'type', type: 'string', facet: true },
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'species', type: 'string', facet: true, optional: true },
    { name: 'caratWeight', type: 'float', facet: true, optional: true },
    { name: 'treatment', type: 'string', facet: true, optional: true },
    { name: 'certAuthority', type: 'string', facet: true, optional: true },
    { name: 'origin', type: 'string', facet: true, optional: true },
    { name: 'equipmentType', type: 'string', facet: true, optional: true },
    { name: 'condition', type: 'string', facet: true, optional: true },
    { name: 'priceAmountCents', type: 'int64', facet: true },
    { name: 'priceCurrency', type: 'string', facet: true },
    { name: 'sellerId', type: 'string' },
    { name: 'publishedAtTs', type: 'int64' },
  ],
  default_sorting_field: 'publishedAtTs',
}

// Idempotent, called from SearchIndexService.onModuleInit — the API is a
// persistent container (CLAUDE.md "Stack"), so "create the collection if
// it's missing, once, on boot" needs no separate manual init step the way
// a serverless/ephemeral deployment would. Never alters an *existing*
// collection's schema (Typesense collections are schema-immutable after
// creation other than adding fields) — a real field change here means
// dropping and recreating the collection by hand during local dev, same
// as any other locally-evolving-schema tool at this project stage.
export async function ensureListingsCollection() {
  try {
    await typesense.collections(LISTINGS_COLLECTION).retrieve()
  } catch (err) {
    if (err instanceof Typesense.Errors.ObjectNotFound) {
      await typesense.collections().create(LISTINGS_SCHEMA)
      return
    }
    throw err
  }
}

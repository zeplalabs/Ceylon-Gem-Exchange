import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// This module is reached via a static import chain (webhook controller ->
// db/client) that gets evaluated before Nest's ConfigModule.forRoot() runs
// (which only fires once app.module.ts's own decorator body executes) — so
// process.env can't be relied on here without loading it ourselves. In
// staging/prod this is a harmless no-op since there's no .env file and the
// real env vars are already set by the platform.
config({ path: '../../.env' })

// DATABASE_URL (Supabase's shared dev Postgres, when set) takes priority
// over the discrete POSTGRES_* vars (the local Docker Postgres in
// docker-compose.yml). Deliberately separate from POSTGRES_* rather than
// repointing those same vars at Supabase — docker-compose.yml also reads
// POSTGRES_USER/PASSWORD/DB to initialize the *local* container's own role
// on first boot, so overloading them here would mean "what .env says" and
// "what the local container's already-initialized volume actually has"
// silently drift apart. Supabase requires TLS; the local Docker Postgres
// doesn't speak it at all, so ssl only applies on the DATABASE_URL path.
// `rejectUnauthorized: false` (not a full CA chain check) matches
// Supabase's own node-postgres quickstart — acceptable here since this is
// a shared *dev* database, not a production secret boundary.
export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      user: process.env.POSTGRES_USER ?? 'ceylon_gems',
      password: process.env.POSTGRES_PASSWORD ?? 'ceylon_gems_dev',
      database: process.env.POSTGRES_DB ?? 'ceylon_gems',
    })

export const db = drizzle(pool, { schema })

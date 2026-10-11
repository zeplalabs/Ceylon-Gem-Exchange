import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit runs standalone (outside Nest's ConfigModule), so it needs its
// own load of the root .env shared with docker-compose.yml.
config({ path: '../../.env' })

// DATABASE_URL (Supabase's shared dev Postgres), when set, takes priority
// over the discrete POSTGRES_* vars — same split as apps/api/src/db/client.ts,
// see its comment for why these aren't just repointed at Supabase instead.
export default defineConfig(
  process.env.DATABASE_URL
    ? {
        dialect: 'postgresql',
        schema: './src/db/schema.ts',
        out: './drizzle',
        dbCredentials: {
          url: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
        },
      }
    : {
        dialect: 'postgresql',
        schema: './src/db/schema.ts',
        out: './drizzle',
        dbCredentials: {
          host: process.env.POSTGRES_HOST ?? 'localhost',
          port: Number(process.env.POSTGRES_PORT ?? 5432),
          user: process.env.POSTGRES_USER ?? 'ceylon_gems',
          password: process.env.POSTGRES_PASSWORD ?? 'ceylon_gems_dev',
          database: process.env.POSTGRES_DB ?? 'ceylon_gems',
          ssl: false,
        },
      },
)

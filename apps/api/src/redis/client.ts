import Redis from 'ioredis'

// Shared across every Redis-backed feature (currently just phone-reveal's
// rate limiter) — same connection target as health/redis.health-indicator
// .ts's own client, which stays separate since a health check specifically
// wants `lazyConnect`/a short retry budget so a down Redis fails that one
// check fast rather than affecting this client's own callers.
export const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
})

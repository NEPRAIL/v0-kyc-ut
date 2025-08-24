import { getDb } from "@/lib/db"
import { rateLimits } from "@/lib/db/schema"
import { eq, lt } from "drizzle-orm"

interface RateLimitConfig {
  requests: number
  window: number // in seconds
}

const defaultConfig: RateLimitConfig = {
  requests: 5,
  window: 60,
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = defaultConfig,
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  try {
    // Try Upstash Redis if available
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { Ratelimit } = await import("@upstash/ratelimit")
      const { Redis } = await import("@upstash/redis")

      const redis = new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      })

      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.requests, `${config.window} s`),
      })

      const result = await ratelimit.limit(identifier)

      return {
        success: result.success,
        remaining: result.remaining,
        resetTime: result.reset,
      }
    }

    // Fallback to database-based rate limiting
    const db = getDb()
    const now = new Date()
    const windowStart = new Date(now.getTime() - config.window * 1000)

    // Clean up old entries
    await db.delete(rateLimits).where(lt(rateLimits.resetTime, windowStart))

    // Get current count
    const existing = await db.select().from(rateLimits).where(eq(rateLimits.identifier, identifier)).limit(1)

    if (existing.length === 0) {
      // First request in window
      await db.insert(rateLimits).values({
        id: `rl_${identifier}_${Date.now()}`,
        identifier,
        count: 1,
        resetTime: new Date(now.getTime() + config.window * 1000),
      })

      return {
        success: true,
        remaining: config.requests - 1,
        resetTime: now.getTime() + config.window * 1000,
      }
    }

    const current = existing[0]

    if (current.count >= config.requests) {
      return {
        success: false,
        remaining: 0,
        resetTime: current.resetTime.getTime(),
      }
    }

    // Increment count
    await db
      .update(rateLimits)
      .set({ count: current.count + 1 })
      .where(eq(rateLimits.id, current.id))

    return {
      success: true,
      remaining: config.requests - current.count - 1,
      resetTime: current.resetTime.getTime(),
    }
  } catch (error) {
    console.error("Rate limit check failed:", error)
    // On error, allow the request (fail open)
    return {
      success: true,
      remaining: config.requests - 1,
      resetTime: Date.now() + config.window * 1000,
    }
  }
}

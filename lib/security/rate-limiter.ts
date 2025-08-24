interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup()
      },
      5 * 60 * 1000,
    )
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key)
      }
    }
  }

  private getKey(identifier: string, action: string): string {
    return `${identifier}:${action}`
  }

  public async checkLimit(
    identifier: string,
    action: string,
    maxAttempts = 5,
    windowMs: number = 15 * 60 * 1000, // 15 minutes
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.getKey(identifier, action)
    const now = Date.now()
    const resetTime = now + windowMs

    let entry = this.store.get(key)

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired entry
      entry = {
        count: 1,
        resetTime,
        blocked: false,
      }
      this.store.set(key, entry)
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetTime,
      }
    }

    entry.count++

    if (entry.count > maxAttempts) {
      entry.blocked = true
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      }
    }

    return {
      allowed: true,
      remaining: maxAttempts - entry.count,
      resetTime: entry.resetTime,
    }
  }

  public async blockIdentifier(identifier: string, action: string, durationMs: number = 60 * 60 * 1000): Promise<void> {
    const key = this.getKey(identifier, action)
    const resetTime = Date.now() + durationMs

    this.store.set(key, {
      count: 999,
      resetTime,
      blocked: true,
    })
  }

  public async isBlocked(identifier: string, action: string): Promise<boolean> {
    const key = this.getKey(identifier, action)
    const entry = this.store.get(key)

    if (!entry) return false

    const now = Date.now()
    if (entry.resetTime < now) {
      this.store.delete(key)
      return false
    }

    return entry.blocked
  }

  public destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

export const rateLimiter = new RateLimiter()

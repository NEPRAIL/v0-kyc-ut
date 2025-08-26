import { checkRateLimit } from "@/lib/rate-limit"
import { securityMonitor } from "@/lib/security/security-monitor"
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

interface BotSecurityConfig {
  maxRequestsPerMinute: number
  maxTokensPerUser: number
  tokenExpirationDays: number
}

const defaultConfig: BotSecurityConfig = {
  maxRequestsPerMinute: 30,
  maxTokensPerUser: 3,
  tokenExpirationDays: 30,
}

export class BotSecurityManager {
  private config: BotSecurityConfig

  constructor(config: BotSecurityConfig = defaultConfig) {
    this.config = config
  }

  async checkBotRateLimit(telegramUserId: number, endpoint: string): Promise<{ success: boolean; remaining: number }> {
    const identifier = `bot:${telegramUserId}:${endpoint}`
    const result = await checkRateLimit(identifier, {
      requests: this.config.maxRequestsPerMinute,
      window: 60,
    })

    if (!result.success) {
      await securityMonitor.logSecurityEvent({
        type: "suspicious_activity",
        userId: telegramUserId.toString(),
        ipAddress: "telegram-bot",
        userAgent: "telegram-bot",
        details: { reason: "bot_rate_limit_exceeded", endpoint },
        timestamp: new Date(),
      })
    }

    return { success: result.success, remaining: result.remaining }
  }

  validateWebhookSignature(body: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = createHmac("sha256", secret).update(body).digest("hex")

      return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"))
    } catch {
      return false
    }
  }

  sanitizeBotInput(input: string): string {
    return input
      .replace(/[<>]/g, "") // Remove HTML tags
      .replace(/['"]/g, "") // Remove quotes
      .replace(/[\\]/g, "") // Remove backslashes
      .trim()
      .substring(0, 1000) // Limit length
  }

  isValidTelegramUserId(userId: any): userId is number {
    return typeof userId === "number" && userId > 0 && userId < Number.MAX_SAFE_INTEGER
  }

  async detectSuspiciousBotActivity(telegramUserId: number, action: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    // This would typically query a database for recent bot activities
    // For now, we'll implement basic checks

    const identifier = `bot:suspicious:${telegramUserId}`
    const recentActivity = await checkRateLimit(identifier, {
      requests: 100, // Max 100 actions per hour
      window: 3600,
    })

    if (!recentActivity.success) {
      await securityMonitor.logSecurityEvent({
        type: "suspicious_activity",
        userId: telegramUserId.toString(),
        ipAddress: "telegram-bot",
        userAgent: "telegram-bot",
        details: {
          reason: "excessive_bot_activity",
          action,
          hourly_limit_exceeded: true,
        },
        timestamp: new Date(),
      })
      return true
    }

    return false
  }

  generateCommandToken(telegramUserId: number, command: string): string {
    const payload = {
      userId: telegramUserId,
      command,
      timestamp: Date.now(),
      nonce: randomBytes(16).toString("hex"),
    }

    const secret = process.env.WEBHOOK_SECRET || "fallback-secret"
    const signature = createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex")

    return Buffer.from(JSON.stringify({ ...payload, signature })).toString("base64url")
  }

  verifyCommandToken(token: string, expectedUserId: number, expectedCommand: string): boolean {
    try {
      const payload = JSON.parse(Buffer.from(token, "base64url").toString())
      const { userId, command, timestamp, nonce, signature } = payload

      // Check basic validity
      if (userId !== expectedUserId || command !== expectedCommand) {
        return false
      }

      // Check timestamp (token valid for 5 minutes)
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        return false
      }

      // Verify signature
      const expectedPayload = { userId, command, timestamp, nonce }
      const secret = process.env.WEBHOOK_SECRET || "fallback-secret"
      const expectedSignature = createHmac("sha256", secret).update(JSON.stringify(expectedPayload)).digest("hex")

      return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"))
    } catch {
      return false
    }
  }
}

export const botSecurity = new BotSecurityManager()

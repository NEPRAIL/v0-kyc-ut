import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { telegramLinks } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const webhookSecret = request.headers.get("x-webhook-secret")
    const expectedSecret = process.env.WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { telegram_user_id, action, data } = body

    if (!telegram_user_id || !action) {
      return NextResponse.json({ error: "Telegram user ID and action required" }, { status: 400 })
    }

    // Rate limiting for webhook calls
    const rateLimitKey = `webhook:${telegram_user_id}:${action}`
    const rateLimit = await checkRateLimit(rateLimitKey, { requests: 10, window: 60 })

    if (!rateLimit.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    const db = getDb()

    switch (action) {
      case "update_activity":
        // Update last seen timestamp
        await db
          .update(telegramLinks)
          .set({ lastSeenAt: new Date() })
          .where(eq(telegramLinks.telegramUserId, telegram_user_id))
        break

      case "update_username":
        // Update Telegram username
        if (data?.username) {
          await db
            .update(telegramLinks)
            .set({
              telegramUsername: data.username,
              lastSeenAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(telegramLinks.telegramUserId, telegram_user_id))
        }
        break

      case "log_command":
        // Log bot command usage (could be stored in a separate table)
        console.log(`[v0] Bot command logged: ${data?.command} by user ${telegram_user_id}`)
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      action,
      telegram_user_id,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Bot webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

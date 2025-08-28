import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { telegramLinks, orders } from "@/lib/db/schema"
import { eq, count, gte } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // For admin dashboard access, we'll allow read-only status without webhook secret
    // The webhook secret is still required for external webhook calls, but not for internal admin status
    const webhookSecret = request.headers.get("x-webhook-secret")
    const expectedSecret = process.env.WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET

    // Check if this is an admin request (from internal admin dashboard)
    const isAdminRequest = request.headers.get("x-admin-request") === "true"

    // If a secret is provided, verify it. If no secret but it's an admin request, allow it.
    if (expectedSecret && webhookSecret && webhookSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get bot statistics
    const [totalLinks] = await db.select({ count: count() }).from(telegramLinks)

    const [activeLinks] = await db
      .select({ count: count() })
      .from(telegramLinks)
      .where(eq(telegramLinks.isRevoked, false))

    const [recentActivity] = await db
      .select({ count: count() })
      .from(telegramLinks)
      .where(gte(telegramLinks.lastSeenAt, oneDayAgo))

    const [recentOrders] = await db.select({ count: count() }).from(orders).where(gte(orders.createdAt, oneDayAgo))

    // Test bot API connection
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    let botStatus = { connected: false, username: null, id: null }

    if (botToken) {
      try {
        const botResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
          method: "GET",
        })
        const botData = await botResponse.json()

        if (botData.ok) {
          botStatus = {
            connected: true,
            username: botData.result.username,
            id: botData.result.id,
          }
        }
      } catch (error) {
        console.error("[v0] Bot API test failed:", error)
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      bot: botStatus,
      statistics: {
        total_telegram_links: totalLinks.count || 0,
        active_telegram_links: activeLinks.count || 0,
        recent_activity_24h: recentActivity.count || 0,
        recent_orders_24h: recentOrders.count || 0,
      },
      environment: {
        has_bot_token: !!process.env.TELEGRAM_BOT_TOKEN,
        has_webhook_secret: !!process.env.WEBHOOK_SECRET,
        has_admin_id: !!(process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_ADMIN_ID),
        database_connected: true,
      },
    })
  } catch (error) {
    console.error("[v0] Bot status error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get bot status",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

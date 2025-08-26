import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { telegramLinks } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret for admin access
    const webhookSecret = request.headers.get("x-webhook-secret")
    const expectedSecret = process.env.WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { message, target, telegram_user_id, broadcast } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 })
    }

    const db = getDb()
    const results: any[] = []

    if (broadcast) {
      // Send to all active users
      const activeUsers = await db
        .select({ telegramUserId: telegramLinks.telegramUserId })
        .from(telegramLinks)
        .where(eq(telegramLinks.isRevoked, false))

      for (const user of activeUsers) {
        try {
          const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: user.telegramUserId,
              text: message,
              parse_mode: "Markdown",
            }),
          })

          const result = await response.json()
          results.push({
            telegram_user_id: user.telegramUserId,
            success: result.ok,
            error: result.ok ? null : result.description,
          })
        } catch (error) {
          results.push({
            telegram_user_id: user.telegramUserId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }
    } else if (telegram_user_id) {
      // Send to specific user
      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegram_user_id,
            text: message,
            parse_mode: "Markdown",
          }),
        })

        const result = await response.json()
        results.push({
          telegram_user_id,
          success: result.ok,
          error: result.ok ? null : result.description,
        })
      } catch (error) {
        results.push({
          telegram_user_id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    } else if (target === "admin") {
      // Send to admin
      const adminId = process.env.TELEGRAM_ADMIN_ID
      if (!adminId) {
        return NextResponse.json({ error: "Admin ID not configured" }, { status: 500 })
      }

      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: adminId,
            text: message,
            parse_mode: "Markdown",
          }),
        })

        const result = await response.json()
        results.push({
          telegram_user_id: adminId,
          success: result.ok,
          error: result.ok ? null : result.description,
        })
      } catch (error) {
        results.push({
          telegram_user_id: adminId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    } else {
      return NextResponse.json({ error: "Invalid target specified" }, { status: 400 })
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.length - successCount

    console.log(`[v0] Notification sent: ${successCount} success, ${failureCount} failures`)

    return NextResponse.json({
      success: true,
      message: "Notifications processed",
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    })
  } catch (error) {
    console.error("[v0] Bot notification error:", error)
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { orders, telegramLinks } from "@/lib/db/schema"
import { eq, and, count, sum, gte } from "drizzle-orm"
import { getAuthFromRequest } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest()
    const webhookSecret = process.env.WEBHOOK_SECRET
    const webhookHeader = request.headers.get("x-webhook-secret")

    // Allow access for authenticated users or webhook calls
    const hasValidAuth = auth?.userId || (webhookSecret && webhookHeader === webhookSecret)

    if (!hasValidAuth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const telegramUserId = searchParams.get("telegram_user_id")

    const db = getDb()
    let whereCondition: any = undefined

    // If user authenticated (not webhook), scope to their orders
    if (auth?.userId && !webhookHeader) {
      whereCondition = eq(orders.userId, auth.userId)
    }

    // If searching by Telegram user ID, find linked user
    if (telegramUserId) {
      const telegramLink = await db
        .select({ userId: telegramLinks.userId })
        .from(telegramLinks)
        .where(eq(telegramLinks.telegramUserId, Number.parseInt(telegramUserId)))
        .limit(1)

      if (telegramLink.length > 0) {
        whereCondition = eq(orders.userId, telegramLink[0].userId)
      } else {
        // No linked account found
        return NextResponse.json({
          success: true,
          stats: {
            total_orders: 0,
            total_value: 0,
            pending_orders: 0,
            completed_orders: 0,
            recent_orders: 0,
          },
        })
      }
    }

    // Get order statistics
    const [totalStats] = await db
      .select({
        total_orders: count(),
        total_value: sum(orders.totalCents),
      })
      .from(orders)
      .where(whereCondition)

    const [pendingStats] = await db
      .select({ pending_orders: count() })
      .from(orders)
      .where(whereCondition ? and(whereCondition, eq(orders.status, "pending")) : eq(orders.status, "pending"))

    const [completedStats] = await db
      .select({ completed_orders: count() })
      .from(orders)
      .where(whereCondition ? and(whereCondition, eq(orders.status, "delivered")) : eq(orders.status, "delivered"))

    // Recent orders (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [recentStats] = await db
      .select({ recent_orders: count() })
      .from(orders)
      .where(
        whereCondition ? and(whereCondition, gte(orders.createdAt, sevenDaysAgo)) : gte(orders.createdAt, sevenDaysAgo),
      )

    const stats = {
      total_orders: totalStats.total_orders || 0,
      total_value: Number(totalStats.total_value || 0) / 100, // Convert cents to dollars
      pending_orders: pendingStats.pending_orders || 0,
      completed_orders: completedStats.completed_orders || 0,
      recent_orders: recentStats.recent_orders || 0,
    }

    console.log(`[v0] Order stats generated:`, stats)

    return NextResponse.json({
      success: true,
      stats,
      currency: "USD",
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Order stats error:", error)
    return NextResponse.json({ error: "Failed to generate order statistics" }, { status: 500 })
  }
}

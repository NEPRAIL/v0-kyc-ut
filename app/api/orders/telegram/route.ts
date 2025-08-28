import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { orders, telegramLinks } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
  const telegramUserIdStr = url.searchParams.get("telegram_user_id")

  if (!telegramUserIdStr) {
      return NextResponse.json({ error: "Telegram user ID required" }, { status: 400 })
    }
  const telegramUserId = Number(telegramUserIdStr)

    const db = getDb()

    // Find the linked user account
    const telegramLink = await db
      .select()
      .from(telegramLinks)
  .where(eq(telegramLinks.telegramUserId, telegramUserId))
      .limit(1)

    if (telegramLink.length === 0) {
      return NextResponse.json({ error: "Telegram account not linked" }, { status: 404 })
    }

    const userId = telegramLink[0].userId

    // Get user orders
    const userOrders = await db
      .select({
        id: orders.id,
        order_number: orders.id, // Using id as order_number for compatibility
        total_amount: orders.totalCents,
        status: orders.status,
        created_at: orders.createdAt,
        items: orders.items,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(orders.createdAt)

    // Transform orders to match expected format
    const transformedOrders = userOrders.map((order) => ({
      ...order,
      total_amount: Number(order.total_amount) / 100, // Convert cents to dollars
      items: order.items || [],
    }))

    console.log(`[v0] Fetched ${transformedOrders.length} orders for Telegram user ${telegramUserId}`)

    return NextResponse.json({
      success: true,
      orders: transformedOrders,
    })
  } catch (error) {
    console.error("[v0] Failed to fetch Telegram user orders:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

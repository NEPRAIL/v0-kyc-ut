import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { orders, telegramLinks } from "@/lib/db/schema"
import { eq, and, like, or, gte, lte } from "drizzle-orm"
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
    const query = searchParams.get("q") || ""
    const status = searchParams.get("status")
    const telegramUserId = searchParams.get("telegram_user_id")
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const db = getDb()
    const whereConditions: any[] = []

    // If user authenticated (not webhook), scope to their orders
    if (auth?.userId && !webhookHeader) {
      whereConditions.push(eq(orders.userId, auth.userId))
    }

    // If searching by Telegram user ID, find linked user
    if (telegramUserId) {
      const telegramLink = await db
        .select({ userId: telegramLinks.userId })
        .from(telegramLinks)
        .where(eq(telegramLinks.telegramUserId, Number.parseInt(telegramUserId)))
        .limit(1)

      if (telegramLink.length > 0) {
        whereConditions.push(eq(orders.userId, telegramLink[0].userId))
      } else {
        // No linked account found
        return NextResponse.json({ success: true, orders: [], total: 0 })
      }
    }

    // Search by order ID or content
    if (query) {
      whereConditions.push(or(like(orders.id, `%${query}%`), like(orders.status, `%${query}%`)))
    }

    // Filter by status
    if (status) {
      whereConditions.push(eq(orders.status, status))
    }

    // Date range filtering
    if (dateFrom) {
      whereConditions.push(gte(orders.createdAt, new Date(dateFrom)))
    }
    if (dateTo) {
      whereConditions.push(lte(orders.createdAt, new Date(dateTo)))
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

    // Get orders with pagination
    const foundOrders = await db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(orders.createdAt)
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const totalResult = await db.select({ count: orders.id }).from(orders).where(whereClause)

    const total = totalResult.length

    // Transform orders for bot compatibility
    const transformedOrders = foundOrders.map((order) => ({
      id: order.id,
      order_number: order.id,
      total_amount: Number(order.totalCents) / 100,
      currency: order.currency || "USD",
      status: order.status,
      created_at: order.createdAt,
      updated_at: order.createdAt,
      tg_deeplink: order.tgDeeplink,
      items: Array.isArray(order.items)
        ? order.items.map((item: any) => ({
            product_name: item.name || item.productName || "Unknown Product",
            price: item.price_cents ? item.price_cents / 100 : 0,
            quantity: item.qty || item.quantity || 1,
          }))
        : [],
    }))

    console.log(`[v0] Order search completed: ${transformedOrders.length} results for query "${query}"`)

    return NextResponse.json({
      success: true,
      orders: transformedOrders,
      total,
      limit,
      offset,
      query: {
        q: query,
        status,
        telegram_user_id: telegramUserId,
        date_from: dateFrom,
        date_to: dateTo,
      },
    })
  } catch (error) {
    console.error("[v0] Order search error:", error)
    return NextResponse.json({ error: "Failed to search orders" }, { status: 500 })
  }
}

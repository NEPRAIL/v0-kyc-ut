import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { orders, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireUser } from "@/lib/with-auth"
import { requireAuth } from "@/lib/auth-server"

export async function GET(request: NextRequest) {
  try {
    let userId: string
    let userInfo: any = null

    // Try session-based auth first
    try {
      const auth = await requireUser(request)
      if (!(auth instanceof Response)) {
        userId = auth.userId
        // Get user info for better order display
        const db = getDb()
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)
        userInfo = user[0] || null
      } else {
        throw new Error("Session auth failed")
      }
    } catch {
      // Fallback to bot token auth
      const authResult = await requireAuth()
      if (!authResult.ok) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }
      userId = authResult.userId
    }

    const db = getDb()

    const userOrders = await db
      .select({
        id: orders.id,
        totalCents: orders.totalCents,
        currency: orders.currency,
        status: orders.status,
        items: orders.items,
        tgDeeplink: orders.tgDeeplink,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(orders.createdAt)

    const transformedOrders = userOrders.map((order) => ({
      id: order.id,
      order_number: order.id,
      total_amount: Number.parseFloat((order.totalCents / 100).toFixed(2)),
      status: order.status,
      customer_name: userInfo?.username || "User",
      customer_email: userInfo?.email || "",
      created_at: order.createdAt,
      updated_at: order.createdAt,
      payment_status: order.status === "paid" ? "completed" : order.status === "failed" ? "failed" : "pending",
      notes: "",
      telegram_deeplink: order.tgDeeplink,
      items: Array.isArray(order.items)
        ? order.items.map((item: any, index: number) => ({
            id: `${order.id}_${index}`,
            product_name: item.name || item.productName || "Unknown Product",
            product_id: item.productId || item.id || "unknown",
            quantity: item.quantity || item.qty || 1,
            product_price: Number.parseFloat((item.price_cents ? item.price_cents / 100 : 0).toFixed(2)),
            total_price: Number.parseFloat(
              (((item.price_cents || 0) * (item.quantity || item.qty || 1)) / 100).toFixed(2),
            ),
          }))
        : [],
      total_items: Array.isArray(order.items)
        ? order.items.reduce((sum: number, item: any) => sum + (item.quantity || item.qty || 1), 0)
        : 0,
      currency_symbol: order.currency === "USD" ? "$" : order.currency,
    }))

    console.log("[orders/user] Fetched", transformedOrders.length, "orders for user:", userId)

    return NextResponse.json({
      success: true,
      orders: transformedOrders,
      metadata: {
        total_orders: transformedOrders.length,
        total_value: transformedOrders.reduce((sum, order) => sum + order.total_amount, 0),
        status_breakdown: transformedOrders.reduce((acc: any, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1
          return acc
        }, {}),
      },
    })
  } catch (error) {
    console.error("[orders/user] Failed to fetch user orders:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

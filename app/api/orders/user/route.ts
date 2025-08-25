import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireUser } from "@/lib/with-auth"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof Response) return auth
    const { userId } = auth

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
      order_number: order.id, // Use ID as order number
      total_amount: (order.totalCents / 100).toFixed(2), // Convert cents to dollars
      status: order.status,
      customer_name: "User", // Default value
      customer_email: "", // Default value
      created_at: order.createdAt,
      updated_at: order.createdAt,
      payment_status: order.status === "paid" ? "completed" : "pending",
      notes: "",
      items: Array.isArray(order.items)
        ? order.items.map((item: any) => ({
            id: `${order.id}_${item.productId || "unknown"}`,
            product_name: item.name || item.productName || "Unknown Product",
            product_id: item.productId || item.id || "unknown",
            quantity: item.quantity || item.qty || 1,
            product_price: item.price_cents ? (item.price_cents / 100).toFixed(2) : "0.00",
          }))
        : [],
    }))

    console.log("[orders/user] Fetched", transformedOrders.length, "orders for user:", userId)

    return NextResponse.json({
      success: true,
      orders: transformedOrders,
    })
  } catch (error) {
    console.error("[orders/user] Failed to fetch user orders:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

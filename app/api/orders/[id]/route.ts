import { type NextRequest, NextResponse } from "next/server"
import { getAuthFromRequest } from "@/lib/auth-server"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthFromRequest()
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const orderId = params.id

    const whereClause = orderId.startsWith("ord_")
      ? and(eq(orders.id, orderId), eq(orders.userId, auth.userId))
      : and(eq(orders.id, Number.parseInt(orderId) || 0), eq(orders.userId, auth.userId))

    const [order] = await db
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
      .where(whereClause)
      .limit(1)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const transformedOrder = {
      id: order.id,
      order_number: order.id,
      total_amount: Number.parseFloat((order.totalCents / 100).toFixed(2)),
      status: order.status,
      created_at: order.createdAt,
      payment_status: order.status === "paid" ? "completed" : order.status === "failed" ? "failed" : "pending",
      telegram_deeplink: order.tgDeeplink,
      items: Array.isArray(order.items)
        ? order.items.map((item: any, index: number) => ({
            id: `${order.id}_${index}`,
            product_name: item.name || "Unknown Product",
            product_id: item.productId || "unknown",
            quantity: item.qty || 1,
            product_price: Number.parseFloat((item.price_cents ? item.price_cents / 100 : 0).toFixed(2)),
            total_price: Number.parseFloat((((item.price_cents || 0) * (item.qty || 1)) / 100).toFixed(2)),
          }))
        : [],
      total_items: Array.isArray(order.items)
        ? order.items.reduce((sum: number, item: any) => sum + (item.qty || 1), 0)
        : 0,
      currency_symbol: order.currency === "USD" ? "$" : order.currency,
    }

    return NextResponse.json({
      success: true,
      order: transformedOrder,
    })
  } catch (error) {
    console.error("Get order error:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthFromRequest()
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { status } = await request.json()
    const orderId = params.id

    if (!["confirmed", "cancelled", "paid"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const whereClause = orderId.startsWith("ord_")
      ? and(eq(orders.id, orderId), eq(orders.userId, auth.userId))
      : and(eq(orders.id, Number.parseInt(orderId) || 0), eq(orders.userId, auth.userId))

    const [updatedOrder] = await db.update(orders).set({ status }).where(whereClause).returning()

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
      },
      message: `Order ${status} successfully`,
    })
  } catch (error) {
    console.error("Update order error:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}

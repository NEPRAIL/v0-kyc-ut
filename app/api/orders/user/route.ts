import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { orders, orderItems } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getServerAuth } from "@/lib/auth/middleware"

export async function GET(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const db = getDb()

    // Get user orders with items
    const userOrders = await db
      .select({
        id: orders.id,
        order_number: orders.orderNumber,
        total_amount: orders.totalAmount,
        status: orders.status,
        customer_name: orders.customerName,
        customer_email: orders.customerEmail,
        created_at: orders.createdAt,
        updated_at: orders.updatedAt,
      })
      .from(orders)
      .where(eq(orders.userId, auth.user.uid))
      .orderBy(orders.createdAt)

    // Get items for each order
    const ordersWithItems = await Promise.all(
      userOrders.map(async (order) => {
        const items = await db
          .select({
            id: orderItems.id,
            product_name: orderItems.productName,
            product_id: orderItems.productId,
            quantity: orderItems.quantity,
            product_price: orderItems.price,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id))

        return {
          ...order,
          total_amount: Number(order.total_amount),
          payment_status: "pending", // Default for compatibility
          notes: "", // Default for compatibility
          items,
        }
      }),
    )

    console.log("[v0] Fetched", ordersWithItems.length, "orders for user:", auth.user.uid)

    return NextResponse.json({
      success: true,
      orders: ordersWithItems,
    })
  } catch (error) {
    console.error("[v0] Failed to fetch user orders:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

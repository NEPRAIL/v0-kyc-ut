import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { orders, orderItems } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getAuthFromRequest } from "@/lib/auth-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthFromRequest()
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const orderId = params.id
    const db = getDb()

    // Get order details
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, auth.userId)))
      .limit(1)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Get order items
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))

    return NextResponse.json({
      id: order.id,
      order_number: order.orderNumber,
      status: order.status,
      total_amount: Number(order.totalAmount),
      customer_name: order.customerName,
      customer_email: order.customerEmail,
      customer_contact: order.customerContact,
      items: items.map((item) => ({
        product_name: item.productName,
        price: Number(item.price),
        quantity: item.quantity,
      })),
      created_at: order.createdAt,
      expires_at: order.expiresAt,
    })
  } catch (error) {
    console.error("[v0] Order status check error:", error)
    return NextResponse.json({ error: "Failed to check order status" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return PUT(request, { params })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id
    const { status } = await request.json()

    console.log("[v0] Order status update request:", { orderId, status })

    const db = getDb()

    // Update order status
    const [updatedOrder] = await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning()

    if (!updatedOrder) {
      console.log("[v0] Order not found for update:", orderId)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    console.log("[v0] Order status updated successfully:", orderId, "->", status)

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        order_number: updatedOrder.orderNumber,
        status: updatedOrder.status,
        total_amount: Number(updatedOrder.totalAmount),
        updated_at: updatedOrder.updatedAt,
      },
    })
  } catch (error) {
    console.error("[v0] Order status update error:", error)
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
  }
}

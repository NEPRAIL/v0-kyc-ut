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
      order_number: order.id, // Use ID as order number for consistency
      status: order.status,
      total_amount: Number(order.totalCents) / 100, // Convert cents to dollars
      currency: order.currency || "USD",
      customer_name: "User", // Default value for bot compatibility
      customer_email: "", // Default value for bot compatibility
      items: Array.isArray(order.items)
        ? order.items.map((item: any) => ({
            product_name: item.name || item.productName || "Unknown Product",
            price: item.price_cents ? item.price_cents / 100 : 0,
            quantity: item.qty || item.quantity || 1,
          }))
        : items.map((item) => ({
            product_name: item.productName,
            price: Number(item.price),
            quantity: item.quantity,
          })),
      created_at: order.createdAt,
      updated_at: order.createdAt,
      tg_deeplink: order.tgDeeplink,
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
    const body = await request.json()
    const { status, telegram_user_id, updated_via, notes } = body

    console.log("[v0] Order status update request:", { orderId, status, telegram_user_id, updated_via })

    const auth = await getAuthFromRequest()
    const webhookSecret = process.env.WEBHOOK_SECRET
    const webhookHeader = request.headers.get("x-webhook-secret")

    // Allow access if either authenticated user OR valid webhook secret OR valid bot token
    const hasValidAuth = auth?.userId || (webhookSecret && webhookHeader === webhookSecret)

    if (!hasValidAuth) {
      console.log("[v0] Order status update: No valid authentication")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "paid", "failed"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
    }

    const db = getDb()

    let orderQuery = eq(orders.id, orderId)
    if (auth?.userId && !webhookHeader) {
      // If user authenticated and not webhook, scope to user's orders
      orderQuery = and(eq(orders.id, orderId), eq(orders.userId, auth.userId))
    }

    // Update order status
    const [updatedOrder] = await db
      .update(orders)
      .set({
        status,
        ...(notes && { notes }),
      })
      .where(orderQuery)
      .returning()

    if (!updatedOrder) {
      console.log("[v0] Order not found for update:", orderId)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    console.log("[v0] Order status updated successfully:", orderId, "->", status, "via:", updated_via || "web")

    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID

      if (botToken && adminChat && updated_via !== "admin") {
        const statusEmoji =
          {
            pending: "⏳",
            confirmed: "✅",
            processing: "🔄",
            shipped: "📦",
            delivered: "🎉",
            cancelled: "❌",
            paid: "💰",
            failed: "⚠️",
          }[status] || "📋"

        const message = `${statusEmoji} **Order Status Update**

**Order ID:** \`${orderId}\`
**New Status:** ${status.toUpperCase()}
**Total:** $${(updatedOrder.totalCents / 100).toFixed(2)}
**Updated via:** ${updated_via || "Web"}
${notes ? `**Notes:** ${notes}` : ""}

Updated: ${new Date().toLocaleString()}`

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: adminChat,
            text: message,
            parse_mode: "Markdown",
          }),
        })
      }
    } catch (notificationError) {
      console.error("[v0] Failed to send status update notification:", notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        order_number: updatedOrder.id,
        status: updatedOrder.status,
        total_amount: Number(updatedOrder.totalCents) / 100,
        currency: updatedOrder.currency || "USD",
        updated_at: new Date(),
        tg_deeplink: updatedOrder.tgDeeplink,
      },
    })
  } catch (error) {
    console.error("[v0] Order status update error:", error)
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
  }
}

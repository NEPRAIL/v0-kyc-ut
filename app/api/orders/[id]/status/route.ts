export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders, orderItems } from "@/drizzle/schema"
import { eq, and } from "drizzle-orm"
import { requireAuthSoft, requireWebhook } from "@/lib/auth-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuthSoft()
    if (!auth?.user.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const orderId = params.id
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, auth.user.id)))
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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}) as any)
  const status = String(body?.status || "").toLowerCase()
  const allowed = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
  if (!allowed.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 })

  // Allow either authenticated site user OR Telegram bot via secret
  let userId: string | null = null
  const r = await requireAuthSoft()
  if (r) {
    userId = r.user.id
  } else {
    if (!(await requireWebhook())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // Optional: If coming from Telegram, map telegram_user_id to a user; else skip ownership check.
    // Keeping simple for now.
  }

  const [row] = await db.select().from(orders).where(eq(orders.id, params.id)).limit(1)
  if (!row) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (userId && row.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await db.update(orders).set({ status }).where(eq(orders.id, params.id))

  console.log(`[v0] Order ${params.id} status updated to ${status}`)

  return NextResponse.json({ success: true })
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return PATCH(req, { params })
}

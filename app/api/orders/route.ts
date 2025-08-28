import { type NextRequest, NextResponse } from "next/server"
import { getAuthFromRequest } from "@/lib/auth-server"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { randomBytes } from "node:crypto"

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest()
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()

    let items = []
    if (body.items && Array.isArray(body.items)) {
      // New format with items array
      items = body.items
    } else if (body.productId) {
      // Old format - convert to new format
      items = [
        {
          id: body.productId,
          name: body.productName || "Product",
          price: body.price || 0,
          quantity: body.qty || 1,
          variantId: body.variantId,
        },
      ]
    } else {
      return NextResponse.json({ error: "Invalid order format" }, { status: 400 })
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    const totalCents = Math.round(items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) * 100)
    const id = "ord_" + randomBytes(12).toString("hex")
    const botUser = process.env.TELEGRAM_BOT_USERNAME || ""
    const deepLink = botUser ? `https://t.me/${botUser}?start=order_${id}` : null

    const orderData = {
      id,
      userId: auth.userId,
      items: items.map((item: any) => ({
        productId: item.id,
        name: item.name,
        price_cents: Math.round(item.price * 100),
        qty: item.quantity,
        variantId: item.variantId || null,
      })) as any,
      totalCents,
      currency: "USD",
      status: "pending",
      tgDeeplink: deepLink,
    }

    const [order] = await db.insert(orders).values(orderData).returning()

    // Send Telegram notification to admin
    await sendTelegramNotification(order, items)

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        total: totalCents / 100,
        status: "pending",
        items: items,
      },
      tgDeepLink: deepLink,
      message: "Order created successfully. Complete payment via Telegram bot.",
    })
  } catch (error) {
    console.error("Create order error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest()
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

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
      .where(eq(orders.userId, auth.userId))
      .orderBy(orders.createdAt)
      .limit(limit)
      .offset(offset)

    const transformedOrders = userOrders.map((order) => ({
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
    }))

    return NextResponse.json({
      success: true,
      orders: transformedOrders,
      metadata: {
        total_orders: transformedOrders.length,
        total_value: transformedOrders.reduce((sum, order) => sum + order.total_amount, 0),
      },
    })
  } catch (error) {
    console.error("Get orders error:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

async function sendTelegramNotification(order: any, items: any[]) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const adminId = process.env.TELEGRAM_ADMIN_CHAT_ID

    if (!botToken || !adminId) {
      return
    }

    const itemsText = items
      .map((item) => `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`)
      .join("\n")

    const message = `🔔 **NEW ORDER CREATED**

**Order ID:** \`${order.id}\`
**Total:** $${(order.totalCents / 100).toFixed(2)}
**Status:** ${order.status.toUpperCase()}

**Items:**
${itemsText}

Use /order ${order.id} in the bot to manage this order.`

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminId,
        text: message,
        parse_mode: "Markdown",
      }),
    })
  } catch (error) {
    console.error("Failed to send Telegram notification:", error)
  }
}

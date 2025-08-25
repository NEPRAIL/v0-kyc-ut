import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { orders, orderItems } from "@/lib/db/schema"
import { getServerAuth } from "@/lib/auth/middleware"

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  verificationLevel?: string
  category?: string
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth()
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { items }: { items: CartItem[] } = await request.json()

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    // Calculate total amount
    const totalUSD = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const db = getDb()

    // Create order record
    const [order] = await db
      .insert(orders)
      .values({
        userId: auth.user.uid,
        orderNumber,
        totalAmount: totalUSD,
        status: "pending",
        customerName: "",
        customerEmail: auth.user.email || "",
        customerContact: "",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      })
      .returning()

    // Create order items
    const orderItemsData = items.map((item) => ({
      orderId: order.id,
      productId: item.id,
      productName: item.name,
      price: item.price,
      quantity: item.quantity,
    }))

    await db.insert(orderItems).values(orderItemsData)

    console.log("[v0] Order created:", order.id, "for user:", auth.user.uid)

    // Send Telegram notification to admin
    await sendTelegramNotification(order, items)

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: totalUSD,
        status: "pending",
        items: items,
      },
      message: "Order created successfully. Complete payment via Telegram bot.",
    })
  } catch (error) {
    console.error("[v0] Order creation error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

async function sendTelegramNotification(order: any, items: CartItem[]) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const adminId = process.env.TELEGRAM_ADMIN_ID

    if (!botToken || !adminId) {
      console.log("[v0] Telegram notification skipped - missing bot token or admin ID")
      return
    }

    const itemsText = items
      .map((item) => `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`)
      .join("\n")

    const message = `🔔 **NEW ORDER CREATED**

**Order ID:** \`${order.orderNumber}\`
**Total:** $${Number(order.totalAmount).toFixed(2)}
**Status:** ${order.status.toUpperCase()}
**Created:** ${new Date().toLocaleString()}

**Items:**
${itemsText}

**Customer:**
• Email: ${order.customerEmail}

Use /order ${order.orderNumber} in the bot to manage this order.`

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`

    await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: adminId,
        text: message,
        parse_mode: "Markdown",
      }),
    })

    console.log("[v0] Telegram notification sent for order:", order.id)
  } catch (error) {
    console.error("[v0] Failed to send Telegram notification:", error)
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { requireAuth } from "@/lib/auth-server"
import { randomBytes } from "node:crypto"

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  verificationLevel?: string
  category?: string
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Order creation started")

    const auth = await requireAuth()
    if (!auth.ok) {
      console.log("[v0] Authentication failed")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    console.log("[v0] Request body:", JSON.stringify(body, null, 2))

    const { items }: { items: CartItem[] } = body

    if (!items || items.length === 0) {
      console.log("[v0] Cart is empty")
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    const totalCents = Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100)
    console.log("[v0] Total amount calculated:", totalCents, "cents")

    const id = "ord_" + randomBytes(12).toString("hex")
    const botUser = process.env.TELEGRAM_BOT_USERNAME || ""
    const deepLink = botUser ? `https://t.me/${botUser}?start=order_${id}` : null

    const db = getDb()
    console.log("[v0] Database connection obtained")

    const orderData = {
      id,
      userId: auth.userId,
      items: items.map((item) => ({
        productId: item.id,
        name: item.name,
        price_cents: Math.round(item.price * 100),
        qty: item.quantity,
      })) as any,
      totalCents,
      currency: "USD",
      status: "pending",
      tgDeeplink: deepLink,
    }

    console.log("[v0] Order data to insert:", JSON.stringify(orderData, null, 2))

    const [order] = await db.insert(orders).values(orderData).returning()
    console.log("[v0] Order created successfully:", order.id)

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
    console.error("[v0] Order creation error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

async function sendTelegramNotification(order: any, items: CartItem[]) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const adminId = process.env.TELEGRAM_ADMIN_CHAT_ID

    if (!botToken || !adminId) {
      console.log("[v0] Telegram notification skipped - missing bot token or admin ID")
      return
    }

    const itemsText = items
      .map((item) => `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`)
      .join("\n")

    const message = `🔔 **NEW ORDER CREATED**

**Order ID:** \`${order.id}\`
**Total:** $${(order.totalCents / 100).toFixed(2)}
**Status:** ${order.status.toUpperCase()}
**Created:** ${new Date().toLocaleString()}

**Items:**
${itemsText}

Use /order ${order.id} in the bot to manage this order.`

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

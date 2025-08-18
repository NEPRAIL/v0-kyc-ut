import { type NextRequest, NextResponse } from "next/server"
import { btcpayClient } from "@/lib/btcpay/client"
import { db } from "@/lib/db"
import { orders, events } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const headers = Object.fromEntries(request.headers.entries())

    // Verify webhook signature
    const webhookData = btcpayClient.verifyWebhook(headers, rawBody)
    if (!webhookData) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
    }

    console.log("BTCPay webhook received:", webhookData)

    // Find order by invoice ID
    const [order] = await db.select().from(orders).where(eq(orders.btcpayInvoiceId, webhookData.invoiceId)).limit(1)

    if (!order) {
      console.error("Order not found for invoice:", webhookData.invoiceId)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Map webhook type to order status
    const newStatus = btcpayClient.mapWebhookTypeToOrderStatus(webhookData.type)
    if (!newStatus) {
      console.log("Ignoring webhook type:", webhookData.type)
      return NextResponse.json({ message: "Webhook type ignored" })
    }

    // Update order status if it's different
    if (order.status !== newStatus) {
      await db
        .update(orders)
        .set({ status: newStatus as any })
        .where(eq(orders.id, order.id))

      // Log event
      await db.insert(events).values({
        orderId: order.id,
        kind: `webhook_${webhookData.type}`,
        data: JSON.stringify(webhookData),
      })

      console.log(`Order ${order.id} status updated: ${order.status} -> ${newStatus}`)
    }

    return NextResponse.json({ message: "Webhook processed successfully" })
  } catch (error) {
    console.error("BTCPay webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

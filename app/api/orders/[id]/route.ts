import { type NextRequest, NextResponse } from "next/server"
import { getAuthFromRequest } from "@/lib/auth-server"
import { db } from "@/lib/db"
import { orders, products, variants } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { btcpayClient } from "@/lib/btcpay/client"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthFromRequest()
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { id } = await params
    const orderId = Number.parseInt(id)

    const [order] = await db
      .select({
        id: orders.id,
        qty: orders.qty,
        priceSats: orders.priceSats,
        status: orders.status,
        createdAt: orders.createdAt,
        btcpayInvoiceId: orders.btcpayInvoiceId,
        product: {
          id: products.id,
          name: products.name,
          description: products.description,
          imageUrl: products.imageUrl,
        },
        variant: {
          id: variants.id,
          label: variants.label,
          isHolographic: variants.isHolographic,
          color: variants.color,
        },
      })
      .from(orders)
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(variants, eq(orders.variantId, variants.id))
      .where(and(eq(orders.id, orderId), eq(orders.userId, auth.userId)))
      .limit(1)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    let invoiceData = null
    if (order.btcpayInvoiceId && btcpayClient.isReady()) {
      try {
        invoiceData = await btcpayClient.getInvoice(order.btcpayInvoiceId)
      } catch (error) {
        console.error("Failed to fetch invoice data:", error)
      }
    }

    return NextResponse.json({
      order,
      invoice: invoiceData,
    })
  } catch (error) {
    console.error("Get order error:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

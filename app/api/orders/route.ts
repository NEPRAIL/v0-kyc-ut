import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { orders, listings, products, variants } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { btcpayClient } from "@/lib/btcpay/client"

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth()
    const { productId, variantId, qty = 1 } = await request.json()

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    // Find the appropriate listing
    let listing
    if (variantId) {
      ;[listing] = await db
        .select()
        .from(listings)
        .where(and(eq(listings.productId, productId), eq(listings.variantId, variantId), eq(listings.active, true)))
        .limit(1)
    } else {
      ;[listing] = await db
        .select()
        .from(listings)
        .where(and(eq(listings.productId, productId), eq(listings.variantId, null), eq(listings.active, true)))
        .limit(1)
    }

    if (!listing) {
      return NextResponse.json({ error: "Item not available for purchase" }, { status: 400 })
    }

    if (listing.stock < qty) {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 400 })
    }

    // Get product details for description
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1)

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Get variant details if applicable
    let variant = null
    if (variantId) {
      ;[variant] = await db.select().from(variants).where(eq(variants.id, variantId)).limit(1)
    }

    const totalPrice = listing.priceSats * qty
    const description = variant ? `${product.name} - ${variant.label}` : product.name

    // Create order record
    const [order] = await db
      .insert(orders)
      .values({
        userId: user.id,
        productId,
        variantId: variantId || null,
        qty,
        priceSats: totalPrice,
        status: "pending",
      })
      .returning()

    if (btcpayClient.isReady()) {
      try {
        // Create BTCPay invoice
        const invoice = await btcpayClient.createInvoice({
          amountSats: totalPrice,
          orderId: order.id,
          description,
        })

        // Update order with invoice ID
        await db
          .update(orders)
          .set({
            btcpayInvoiceId: invoice.id,
            status: "unpaid",
          })
          .where(eq(orders.id, order.id))

        // Reserve stock (reduce available stock)
        await db
          .update(listings)
          .set({
            stock: listing.stock - qty,
          })
          .where(eq(listings.id, listing.id))

        return NextResponse.json({
          orderId: order.id,
          invoiceId: invoice.id,
          checkoutLink: invoice.checkoutLink,
          amount: totalPrice,
          description,
        })
      } catch (error) {
        // If BTCPay fails, clean up the order
        await db.delete(orders).where(eq(orders.id, order.id))
        throw error
      }
    } else {
      await db
        .update(orders)
        .set({
          status: "pending_payment",
        })
        .where(eq(orders.id, order.id))

      // Reserve stock (reduce available stock)
      await db
        .update(listings)
        .set({
          stock: listing.stock - qty,
        })
        .where(eq(listings.id, listing.id))

      return NextResponse.json({
        orderId: order.id,
        amount: totalPrice,
        description,
        message: "Order created. Payment processing is currently unavailable.",
      })
    }
  } catch (error) {
    console.error("Create order error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth()
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    const userOrders = await db
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
          imageUrl: products.imageUrl,
        },
        variant: {
          id: variants.id,
          label: variants.label,
        },
      })
      .from(orders)
      .leftJoin(products, eq(orders.productId, products.id))
      .leftJoin(variants, eq(orders.variantId, variants.id))
      .where(eq(orders.userId, user.id))
      .orderBy(orders.createdAt)
      .limit(limit)
      .offset(offset)

    return NextResponse.json({ orders: userOrders })
  } catch (error) {
    console.error("Get orders error:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

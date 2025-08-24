import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/middleware"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth(request)
    const { items, customerInfo }: { items: CartItem[]; customerInfo: any } = await request.json()

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    // Calculate total amount
    const totalUSD = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create order record
    const orderResult = await sql`
      INSERT INTO orders (
        user_id, order_number, total_amount, status, customer_name, 
        customer_email, customer_contact, expires_at, created_at
      ) VALUES (
        ${user.id}, ${orderNumber}, ${totalUSD}, 'pending',
        ${customerInfo?.name || ""}, ${customerInfo?.email || user.email}, 
        ${customerInfo?.contact || ""}, ${new Date(Date.now() + 24 * 60 * 60 * 1000)}, NOW()
      )
      RETURNING *
    `

    const order = orderResult[0]

    // Create order items
    for (const item of items) {
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, price, quantity)
        VALUES (${order.id}, ${item.id}, ${item.name}, ${item.price}, ${item.quantity})
      `
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        total: totalUSD,
        status: "pending",
        items: items,
      },
      message: "Order created successfully. Complete payment via Telegram bot.",
    })
  } catch (error) {
    console.error("Order creation error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

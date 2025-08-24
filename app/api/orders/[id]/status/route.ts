import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/middleware"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireAuth(request)
    const orderId = params.id

    const result = await sql`
      SELECT o.*, oi.product_name, oi.price, oi.quantity
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ${orderId} AND o.user_id = ${user.id}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const order = result[0]
    const items = result.map((row) => ({
      product_name: row.product_name,
      price: row.price,
      quantity: row.quantity,
    }))

    return NextResponse.json({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_contact: order.customer_contact,
      items: items,
      created_at: order.created_at,
      expires_at: order.expires_at,
    })
  } catch (error) {
    console.error("Order status check error:", error)
    return NextResponse.json({ error: "Failed to check order status" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id
    const { status } = await request.json()

    // Update order status
    const result = await sql`
      UPDATE orders 
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${orderId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      order: result[0],
    })
  } catch (error) {
    console.error("Order status update error:", error)
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
  }
}

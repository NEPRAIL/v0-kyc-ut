import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/middleware"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireAuth(request)
    const orderId = params.id

    // Get order with Bitcoin address info
    const result = await sql`
      SELECT o.*, ba.address, ba.amount_expected, ba.amount_received, ba.status as payment_status
      FROM orders o
      LEFT JOIN bitcoin_addresses ba ON o.bitcoin_address_id = ba.id
      WHERE o.id = ${orderId} AND o.user_id = ${user.id}
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const order = result[0]

    return NextResponse.json({
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      amount_received: order.amount_received,
      amount_expected: order.amount_expected,
    })
  } catch (error) {
    console.error("Order status check error:", error)
    return NextResponse.json({ error: "Failed to check order status" }, { status: 500 })
  }
}

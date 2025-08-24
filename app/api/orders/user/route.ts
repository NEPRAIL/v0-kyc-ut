import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireAuth } from "@/lib/auth/middleware"

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth()

    const sql = neon(process.env.DATABASE_URL!)

    const orders = await sql`
      SELECT 
        o.id,
        o.order_number,
        o.total_amount,
        o.status,
        o.payment_status,
        o.created_at,
        o.updated_at,
        o.notes,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_name', oi.product_name,
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'product_price', oi.product_price
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ${user.id}
      GROUP BY o.id, o.order_number, o.total_amount, o.status, o.payment_status, o.created_at, o.updated_at, o.notes
      ORDER BY o.created_at DESC
    `

    return NextResponse.json({
      success: true,
      orders: orders || [],
    })
  } catch (error) {
    console.error("Failed to fetch user orders:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

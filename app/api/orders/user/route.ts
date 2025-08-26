import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { requireAuthSoft } from "@/lib/auth-server"

export async function GET() {
  const r = await requireAuthSoft()
  if (!r) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const list = await db.select().from(orders).where(eq(orders.userId, r.user.id)).orderBy(orders.createdAt)
  const transformed = list.map((o) => ({
    id: o.id,
    order_number: o.orderNumber,
    total_amount: Number(o.totalAmount),
    status: o.status,
    created_at: o.createdAt,
    items: o.items,
    customer_name: r.user.username,
    customer_email: r.user.email,
  }))

  return NextResponse.json({ orders: transformed })
}

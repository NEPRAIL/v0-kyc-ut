import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orders, users } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { requireWebhook } from "@/lib/auth-server"

export async function GET(req: Request) {
  if (!(await requireWebhook())) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const url = new URL(req.url)
  const tg = url.searchParams.get("telegram_user_id")
  if (!tg) return NextResponse.json({ error: "Missing telegram_user_id" }, { status: 400 })

  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.telegramUserId, Number(tg)))
    .limit(1)
  if (!u) return NextResponse.json({ orders: [] })

  const list = await db.select().from(orders).where(eq(orders.userId, u.id)).orderBy(orders.createdAt)

  const transformed = list.map((o) => ({
    id: o.id,
    order_number: o.orderNumber,
    total_amount: Number(o.totalAmount),
    status: o.status,
    created_at: o.createdAt,
    items: o.items,
    customer_name: u.username,
    customer_email: u.email,
  }))
  return NextResponse.json({ orders: transformed })
}

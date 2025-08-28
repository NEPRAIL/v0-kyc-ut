import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { like, sql } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    const baseSelect = db.select().from(orders)
    const rows = search
      ? await baseSelect.where(like(orders.id, `%${search}%`)).limit(limit).offset(offset)
      : await baseSelect.limit(limit).offset(offset)

    const countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(orders)
    const [{ count }] = search
      ? await countQuery.where(like(orders.id, `%${search}%`))
      : await countQuery

    const result = rows.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      totalCents: r.totalCents,
      status: r.status,
      createdAt: r.createdAt,
      itemsCount: Array.isArray(r.items) ? r.items.reduce((n: number, it: any) => n + (it.qty || 1), 0) : 0,
    }))

    return NextResponse.json({
      orders: result,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    })
  } catch (error) {
    console.error("[admin] orders list error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

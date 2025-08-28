import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { telegramLinks } from "@/lib/db/schema"
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

    const baseSelect = db.select().from(telegramLinks)
    const rows = search
      ? await baseSelect.where(like(telegramLinks.telegramUsername, `%${search}%`)).limit(limit).offset(offset)
      : await baseSelect.limit(limit).offset(offset)

    const countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(telegramLinks)
    const [{ count }] = search
      ? await countQuery.where(like(telegramLinks.telegramUsername, `%${search}%`))
      : await countQuery

    return NextResponse.json({
      links: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    })
  } catch (error) {
    console.error("[admin] telegram links list error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

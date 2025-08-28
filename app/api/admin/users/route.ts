import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { users, telegramLinks } from "@/lib/db/schema"
import { like, sql, eq } from "drizzle-orm"

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

    const baseSelect = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        telegramUserId: telegramLinks.telegramUserId,
        telegramUsername: telegramLinks.telegramUsername,
      })
      .from(users)
      .leftJoin(telegramLinks, eq(telegramLinks.userId, users.id))

    const rows = search
      ? await baseSelect.where(like(users.username, `%${search}%`)).limit(limit).offset(offset)
      : await baseSelect.limit(limit).offset(offset)
    const countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(users)
    const [{ count }] = search
      ? await countQuery.where(like(users.username, `%${search}%`))
      : await countQuery

    const result = rows.map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      emailVerified: r.emailVerified,
      createdAt: r.createdAt,
      telegram: r.telegramUserId
        ? { telegramUserId: r.telegramUserId as unknown as number, telegramUsername: r.telegramUsername }
        : null,
    }))

    return NextResponse.json({
      users: result,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    })
  } catch (error) {
    console.error("[admin] users list error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

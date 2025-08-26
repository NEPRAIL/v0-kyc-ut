import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { seasons } from "@/lib/db/schema"
import { like, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    let query = db.select().from(seasons)

    if (search) {
      query = query.where(like(seasons.name, `%${search}%`))
    }

    const results = await query.limit(limit).offset(offset).orderBy(seasons.name)

    // Get total count
    let countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(seasons)
    if (search) {
      countQuery = countQuery.where(like(seasons.name, `%${search}%`))
    }
    const [{ count }] = await countQuery

    return NextResponse.json({
      seasons: results,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    })
  } catch (error) {
    console.error("Admin seasons API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const { name } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const [season] = await db.insert(seasons).values({ name }).returning()

    return NextResponse.json({ season })
  } catch (error) {
    console.error("Create season error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

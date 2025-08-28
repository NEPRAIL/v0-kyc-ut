import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { seasons } from "@/lib/db/schema"
import { like, sql } from "drizzle-orm"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const createSeasonSchema = z.object({
  name: z.string().min(1),
})

const querySchema = z.object({
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse({
      search: searchParams.get("search"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    })

    const search = query.search || ""
    const page = Number.parseInt(query.page || "1")
    const limit = Number.parseInt(query.limit || "10")
    const offset = (page - 1) * limit

    const where = search ? like(seasons.name, `%${search}%`) : undefined
    const results = await db
      .select()
      .from(seasons)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(seasons.name)

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(seasons)
      .where(where)

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
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { name } = createSeasonSchema.parse(body)

    const [season] = await db.insert(seasons).values({ name }).returning()

    return NextResponse.json({ season })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
    }
    console.error("Create season error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

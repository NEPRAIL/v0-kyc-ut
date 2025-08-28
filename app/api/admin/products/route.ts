import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { products, seasons, rarities } from "@/lib/db/schema"
import { and, like, sql, eq } from "drizzle-orm"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.union([z.string(), z.null()]).optional(),
  imageUrl: z.union([z.string().url(), z.null()]).optional(),
  seasonId: z.union([z.string().uuid(), z.null()]).optional(),
  rarityId: z.union([z.string().uuid(), z.null()]).optional(),
  // legacy fields removed from schema; keep input tolerant but ignore
  redeemable: z.boolean().optional(),
  series: z.union([z.string(), z.null()]).optional(),
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
    const parsedQuery = querySchema.parse({
      search: searchParams.get("search"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    })

    const search = parsedQuery.search || ""
    const page = Number.parseInt(parsedQuery.page || "1")
    const limit = Number.parseInt(parsedQuery.limit || "10")
    const offset = (page - 1) * limit

    const baseSelect = db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        description: products.description,
        imageUrl: products.imageUrl,
        createdAt: products.createdAt,
        season: {
          id: seasons.id,
          name: seasons.name,
        },
        rarity: {
          id: rarities.id,
          name: rarities.name,
        },
      })
      .from(products)
      .leftJoin(seasons, eq(products.seasonId, seasons.id))
      .leftJoin(rarities, eq(products.rarityId, rarities.id))
    const where = search ? like(products.name, `%${search}%`) : undefined
    const results = await baseSelect
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(products.createdAt)

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products)
      .where(where)

    return NextResponse.json({
      products: results,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    })
  } catch (error) {
    console.error("Admin products API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const data = createProductSchema.parse(body)

    const [product] = await db
      .insert(products)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        seasonId: data.seasonId || null,
        rarityId: data.rarityId || null,
      })
      .returning()

    return NextResponse.json({ product })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
    }
    console.error("Create product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

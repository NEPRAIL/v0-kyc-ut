import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { products, seasons, rarities } from "@/lib/db/schema"
import { eq, like, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    let query = db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        description: products.description,
        imageUrl: products.imageUrl,
        redeemable: products.redeemable,
        series: products.series,
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

    if (search) {
      query = query.where(like(products.name, `%${search}%`))
    }

    const results = await query.limit(limit).offset(offset).orderBy(products.createdAt)

    // Get total count
    let countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(products)
    if (search) {
      countQuery = countQuery.where(like(products.name, `%${search}%`))
    }
    const [{ count }] = await countQuery

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
    await requireAdmin()

    const data = await request.json()
    const { name, slug, description, imageUrl, seasonId, rarityId, redeemable, series } = data

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    const [product] = await db
      .insert(products)
      .values({
        name,
        slug,
        description: description || null,
        imageUrl: imageUrl || null,
        seasonId: seasonId || null,
        rarityId: rarityId || null,
        redeemable: redeemable || false,
        series: series || null,
      })
      .returning()

    return NextResponse.json({ product })
  } catch (error) {
    console.error("Create product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

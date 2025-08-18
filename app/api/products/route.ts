import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { products, seasons, rarities, variants, listings } from "@/lib/db/schema"
import { eq, and, like, inArray, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const seasonIds = searchParams.get("seasons")?.split(",").filter(Boolean) || []
    const rarityIds = searchParams.get("rarities")?.split(",").filter(Boolean) || []
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    let query = db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        description: products.description,
        imageUrl: products.imageUrl,
        season: {
          id: seasons.id,
          name: seasons.name,
        },
        rarity: {
          id: rarities.id,
          name: rarities.name,
          color: rarities.color,
        },
        lowestPrice: sql<string>`MIN(${listings.price})`.as("lowestPrice"),
        totalStock: sql<number>`SUM(${listings.stock})`.as("totalStock"),
        hasVariants: sql<boolean>`COUNT(${variants.id}) > 0`.as("hasVariants"),
      })
      .from(products)
      .leftJoin(seasons, eq(products.seasonId, seasons.id))
      .leftJoin(rarities, eq(products.rarityId, rarities.id))
      .leftJoin(listings, and(eq(listings.productId, products.id), eq(listings.isActive, true)))
      .leftJoin(variants, eq(variants.productId, products.id))
      .where(eq(products.isActive, true))
      .groupBy(products.id, seasons.id, rarities.id)

    // Apply filters
    const conditions = [eq(products.isActive, true)]

    if (search) {
      conditions.push(like(products.name, `%${search}%`))
    }

    if (seasonIds.length > 0) {
      conditions.push(inArray(products.seasonId, seasonIds))
    }

    if (rarityIds.length > 0) {
      conditions.push(inArray(products.rarityId, rarityIds))
    }

    if (conditions.length > 1) {
      query = query.where(and(...conditions))
    }

    const results = await query.limit(limit).offset(offset)

    // Get total count for pagination
    let countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(products)
    if (conditions.length > 1) {
      countQuery = countQuery.where(and(...conditions))
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
    console.error("Products API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

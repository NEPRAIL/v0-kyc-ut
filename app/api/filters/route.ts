import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { products, seasons, rarities, variants } from "@/lib/db/schema"
import { sql, eq, and } from "drizzle-orm"

export async function GET() {
  try {
    // Get season counts
    const seasonCounts = await db
      .select({
        id: seasons.id,
        name: seasons.name,
        count: sql<number>`COUNT(${products.id})`.as("count"),
      })
      .from(seasons)
      .leftJoin(products, and(eq(products.seasonId, seasons.id), eq(products.isActive, true)))
      .groupBy(seasons.id, seasons.name)
      .orderBy(seasons.name)

    // Get rarity counts
    const rarityCounts = await db
      .select({
        id: rarities.id,
        name: rarities.name,
        color: rarities.color,
        count: sql<number>`COUNT(${products.id})`.as("count"),
      })
      .from(rarities)
      .leftJoin(products, and(eq(products.rarityId, rarities.id), eq(products.isActive, true)))
      .groupBy(rarities.id, rarities.name, rarities.color)
      .orderBy(rarities.sortOrder)

    const variantCounts = await db
      .select({
        total: sql<number>`COUNT(DISTINCT ${variants.id})`.as("total"),
      })
      .from(variants)
      .leftJoin(products, eq(variants.productId, products.id))
      .where(eq(products.isActive, true))

    return NextResponse.json({
      seasons: seasonCounts,
      rarities: rarityCounts,
      variants: {
        total: variantCounts[0]?.total || 0,
      },
    })
  } catch (error) {
    console.error("Filters API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

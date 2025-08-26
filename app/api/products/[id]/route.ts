import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { products, seasons, rarities, variants, listings } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const productId = Number.parseInt(id)

    const [product] = await db
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
      .where(eq(products.id, productId))
      .limit(1)

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Get variants and their listings
    const productVariants = await db
      .select({
        id: variants.id,
        label: variants.label,
        isHolographic: variants.isHolographic,
        color: variants.color,
        listings: {
          id: listings.id,
          priceSats: listings.priceSats,
          stock: listings.stock,
          active: listings.active,
        },
      })
      .from(variants)
      .leftJoin(listings, and(eq(listings.variantId, variants.id), eq(listings.active, true)))
      .where(eq(variants.productId, productId))

    // Get base product listings (no variant)
    const baseListings = await db
      .select({
        id: listings.id,
        priceSats: listings.priceSats,
        stock: listings.stock,
        active: listings.active,
      })
      .from(listings)
      .where(and(eq(listings.productId, productId), eq(listings.active, true), eq(listings.variantId, null)))

    return NextResponse.json({
      product,
      variants: productVariants,
      baseListings,
    })
  } catch (error) {
    console.error("Product detail API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { db } from "./index"
import { seasons, rarities, products, variants, listings, users } from "./schema"
import { hash } from "bcryptjs"

export async function seedDatabase() {
  try {
    // Seed seasons
    const seasonData = [{ name: "Season 1" }, { name: "Season 2" }, { name: "Genesis" }]

    const insertedSeasons = await db.insert(seasons).values(seasonData).returning()
    console.log("Seeded seasons:", insertedSeasons.length)

    // Seed rarities
    const rarityData = [
      { name: "Common" as const },
      { name: "Uncommon" as const },
      { name: "Rare" as const },
      { name: "Epic" as const },
      { name: "Ultra" as const },
      { name: "Legendary" as const },
      { name: "Grail" as const },
      { name: "Mythic" as const },
      { name: "1of1" as const },
      { name: "Redeemable" as const },
    ]

    const insertedRarities = await db.insert(rarities).values(rarityData).returning()
    console.log("Seeded rarities:", insertedRarities.length)

    // Seed admin user
    const adminPassword = await hash("admin123", 12)
    const adminUser = await db
      .insert(users)
      .values({
        username: "admin",
        passwordHash: adminPassword,
        role: "admin",
      })
      .returning()
    console.log("Seeded admin user")

    // Seed sample products
    const productData = [
      {
        slug: "arcade-season-1-rank-1",
        name: "Arcade Season 1 Rank 1",
        description: "First rank token from Arcade Season 1",
        imageUrl: "/green-arcade-token.png",
        seasonId: insertedSeasons[0].id,
        rarityId: insertedRarities[2].id, // Rare
        series: "Arcade",
      },
      {
        slug: "arcade-season-1-redemption-gold",
        name: "Arcade Season 1 Redemption Token - Gold",
        description: "Special gold redemption token from Season 1",
        imageUrl: "/placeholder-c5j3z.png",
        seasonId: insertedSeasons[0].id,
        rarityId: insertedRarities[9].id, // Redeemable
        redeemable: true,
        series: "Arcade",
      },
    ]

    const insertedProducts = await db.insert(products).values(productData).returning()
    console.log("Seeded products:", insertedProducts.length)

    // Seed variants
    const variantData = [
      {
        productId: insertedProducts[1].id,
        label: "Gold",
        isHolographic: false,
        color: "gold",
      },
      {
        productId: insertedProducts[1].id,
        label: "Holographic Gold",
        isHolographic: true,
        color: "gold",
      },
    ]

    const insertedVariants = await db.insert(variants).values(variantData).returning()
    console.log("Seeded variants:", insertedVariants.length)

    // Seed listings
    const listingData = [
      {
        productId: insertedProducts[0].id,
        priceSats: 100000, // 0.001 BTC
        stock: 5,
        active: true,
      },
      {
        productId: insertedProducts[1].id,
        variantId: insertedVariants[0].id,
        priceSats: 500000, // 0.005 BTC
        stock: 2,
        active: true,
      },
      {
        productId: insertedProducts[1].id,
        variantId: insertedVariants[1].id,
        priceSats: 1000000, // 0.01 BTC
        stock: 1,
        active: true,
      },
    ]

    const insertedListings = await db.insert(listings).values(listingData).returning()
    console.log("Seeded listings:", insertedListings.length)

    console.log("Database seeded successfully!")
  } catch (error) {
    console.error("Error seeding database:", error)
    throw error
  }
}

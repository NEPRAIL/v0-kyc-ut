export const dynamic = "force-dynamic"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/db"
import { products, seasons, rarities, listings, orders } from "@/lib/db/schema"
import { sql, eq } from "drizzle-orm"
import Link from "next/link"
import { Suspense } from "react"
import { StatusRows } from "./components/StatusRows"

export default async function AdminDashboard() {
  let stats
  try {
    // Get overview stats
    const [productCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(products)
    const [seasonCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(seasons)
    const [rarityCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(rarities)
    const [listingCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(listings)
      .where(eq(listings.isActive, true))
    const [orderCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders)

    stats = [
      { title: "Products", value: productCount.count, description: "Total products in catalog" },
      { title: "Active Listings", value: listingCount.count, description: "Items available for purchase" },
      { title: "Seasons", value: seasonCount.count, description: "Product seasons" },
      { title: "Rarities", value: rarityCount.count, description: "Rarity categories" },
      { title: "Orders", value: orderCount.count, description: "Total orders placed" },
    ]
  } catch (error) {
    console.error("[v0] Admin dashboard database error:", error)
    stats = [
      { title: "Products", value: 0, description: "Database unavailable" },
      { title: "Active Listings", value: 0, description: "Database unavailable" },
      { title: "Seasons", value: 0, description: "Database unavailable" },
      { title: "Rarities", value: 0, description: "Database unavailable" },
      { title: "Orders", value: 0, description: "Database unavailable" },
    ]
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your KYCut marketplace</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <a href="/admin/products" className="p-3 border rounded-lg hover:bg-muted transition-colors text-center">
                Manage Products
              </a>
              <a href="/admin/listings" className="p-3 border rounded-lg hover:bg-muted transition-colors text-center">
                Manage Listings
              </a>
              <a href="/admin/seasons" className="p-3 border rounded-lg hover:bg-muted transition-colors text-center">
                Manage Seasons
              </a>
              <a href="/admin/rarities" className="p-3 border rounded-lg hover:bg-muted transition-colors text-center">
                Manage Rarities
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <Suspense fallback={<div className="text-sm text-muted-foreground">Loading status…</div>}>
                <StatusRows />
              </Suspense>
              <div className="pt-2">
                <Link href="/admin/settings" className="underline text-muted-foreground">
                  View settings
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

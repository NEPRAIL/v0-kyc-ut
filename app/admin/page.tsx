import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/db"
import { products, seasons, rarities, listings, orders } from "@/lib/db/schema"
import { sql, eq } from "drizzle-orm"

export default async function AdminDashboard() {
  // Get overview stats
  const [productCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(products)
  const [seasonCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(seasons)
  const [rarityCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(rarities)
  const [listingCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(listings)
    .where(eq(listings.active, true))
  const [orderCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders)

  const stats = [
    { title: "Products", value: productCount.count, description: "Total products in catalog" },
    { title: "Active Listings", value: listingCount.count, description: "Items available for purchase" },
    { title: "Seasons", value: seasonCount.count, description: "Product seasons" },
    { title: "Rarities", value: rarityCount.count, description: "Rarity categories" },
    { title: "Orders", value: orderCount.count, description: "Total orders placed" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your KYCut Shop marketplace</p>
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <span className="text-sm text-green-500">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Authentication</span>
                <span className="text-sm text-green-500">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">BTCPay Server</span>
                <span className="text-sm text-yellow-500">Pending Setup</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

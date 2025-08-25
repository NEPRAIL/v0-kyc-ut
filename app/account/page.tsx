export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getServerAuth } from "@/lib/auth/middleware"
import { getDb } from "@/lib/db"
import { users, orders } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Package, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"

export default async function AccountPage() {
  const auth = await getServerAuth()
  if (!auth) redirect("/login")

  const db = getDb()

  const [user] = await db
    .select({ id: users.id, username: users.username, email: users.email })
    .from(users)
    .where(eq(users.id, auth.user.uid))
    .limit(1)

  if (!user) redirect("/login")

  // Get recent orders with items
  const recentOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      totalAmount: orders.totalAmount,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.userId, auth.user.uid))
    .orderBy(desc(orders.createdAt))
    .limit(5)

  // Get order statistics
  const allOrders = await db
    .select({
      id: orders.id,
      totalAmount: orders.totalAmount,
      status: orders.status,
    })
    .from(orders)
    .where(eq(orders.userId, auth.user.uid))

  const totalSpent = allOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
  const pendingOrders = allOrders.filter((order) => order.status === "pending").length
  const completedOrders = allOrders.filter(
    (order) => order.status === "confirmed" || order.status === "delivered",
  ).length

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
      case "delivered":
        return "bg-green-500"
      case "pending":
        return "bg-yellow-500"
      case "cancelled":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
      case "delivered":
        return CheckCircle
      case "pending":
        return Clock
      default:
        return Package
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user.username}!</h1>
        <p className="text-muted-foreground">{user.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allOrders.length}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedOrders}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingOrders}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/orders">View All Orders</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground mb-4">Start shopping to see your orders here</p>
              <Button asChild>
                <Link href="/shop">Browse Shop</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => {
                const StatusIcon = getStatusIcon(order.status)
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">Order #{order.orderNumber}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">${Number(order.totalAmount).toFixed(2)}</p>
                        <Badge className={`${getStatusColor(order.status)} text-white text-xs`}>
                          {order.status.toUpperCase()}
                        </Badge>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/orders/${order.orderNumber}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalSpent > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{allOrders.length}</p>
                <p className="text-sm text-muted-foreground">Orders Placed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{completedOrders}</p>
                <p className="text-sm text-muted-foreground">Successful Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {allOrders.length > 0 ? Math.round((completedOrders / allOrders.length) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

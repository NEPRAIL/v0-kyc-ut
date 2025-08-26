"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, Clock, XCircle, Search, Filter, Package, Calendar, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

interface OrderItem {
  id: string
  product_name: string
  product_id: string
  quantity: number
  product_price: number
  total_price: number
}

interface Order {
  id: string
  order_number: string
  total_amount: number
  status: string
  payment_status: string
  created_at: string
  updated_at: string
  notes?: string
  items: OrderItem[]
  total_items: number
  currency_symbol: string
  telegram_deeplink?: string
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-500", icon: Clock, variant: "secondary" as const },
  confirmed: { label: "Confirmed", color: "bg-green-500", icon: CheckCircle, variant: "default" as const },
  processing: { label: "Processing", color: "bg-blue-500", icon: Package, variant: "default" as const },
  shipped: { label: "Shipped", color: "bg-purple-500", icon: Package, variant: "default" as const },
  delivered: { label: "Delivered", color: "bg-green-600", icon: CheckCircle, variant: "default" as const },
  cancelled: { label: "Cancelled", color: "bg-red-500", icon: XCircle, variant: "destructive" as const },
  paid: { label: "Paid", color: "bg-green-500", icon: CheckCircle, variant: "default" as const },
  failed: { label: "Failed", color: "bg-red-500", icon: XCircle, variant: "destructive" as const },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    filterAndSortOrders()
  }, [orders, searchTerm, statusFilter, sortBy])

  const fetchOrders = async () => {
    try {
      console.log("[v0] Fetching orders from /api/orders/user")
      const response = await fetch("/api/orders/user", {
        credentials: "include",
      })
      console.log("[v0] Orders API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Orders API response data:", data)
        setOrders(data.orders || [])
        setError("")
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || `Failed to load orders (${response.status})`)
        console.error("[v0] Orders API error:", response.status, errorData)
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortOrders = () => {
    const filtered = orders.filter((order) => {
      const matchesSearch =
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some((item) => item.product_name.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === "all" || order.status === statusFilter

      return matchesSearch && matchesStatus
    })

    // Sort orders
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case "amount-high":
          return b.total_amount - a.total_amount
        case "amount-low":
          return a.total_amount - b.total_amount
        default:
          return 0
      }
    })

    setFilteredOrders(filtered)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusInfo = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-semibold mb-2">Loading Orders</h2>
              <p className="text-muted-foreground">Please wait while we fetch your order history...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="border-destructive/50">
            <CardContent className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-destructive">Error Loading Orders</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={fetchOrders} variant="outline">
                  Try Again
                </Button>
                <Button asChild>
                  <Link href="/account">Go to Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Orders</h1>
            <p className="text-muted-foreground">Track and manage your order history</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search orders by number or product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-48">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="amount-high">Highest Amount</SelectItem>
                  <SelectItem value="amount-low">Lowest Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {orders.length === 0 ? "No Orders Yet" : "No Orders Found"}
              </h2>
              <p className="text-muted-foreground mb-4">
                {orders.length === 0
                  ? "Start shopping to see your orders here"
                  : "Try adjusting your search or filter criteria"}
              </p>
              {orders.length === 0 && (
                <Button asChild>
                  <Link href="/shop">Browse Shop</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status)
              const StatusIcon = statusInfo.icon

              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">Order #{order.order_number}</h3>
                            <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.total_items} item{order.total_items !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <Badge variant={statusInfo.variant} className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {order.items.map((item, index) => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">
                                {item.quantity}x {item.product_name}
                              </span>
                              <span className="font-medium">
                                {order.currency_symbol}
                                {item.total_price.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {order.notes && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              <strong>Notes:</strong> {order.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-2xl font-bold">
                            {order.currency_symbol}
                            {order.total_amount.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/orders/${order.order_number}`}>View Details</Link>
                          </Button>
                          {order.status === "pending" && order.telegram_deeplink && (
                            <Button asChild size="sm">
                              <a href={order.telegram_deeplink} target="_blank" rel="noopener noreferrer">
                                Complete Payment
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {orders.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{orders.length}</p>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    ${orders.reduce((sum, order) => sum + order.total_amount, 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {orders.filter((order) => ["delivered", "paid", "confirmed"].includes(order.status)).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {orders.filter((order) => order.status === "pending").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

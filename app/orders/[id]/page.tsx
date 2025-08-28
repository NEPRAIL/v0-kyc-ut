"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ExternalLink, RefreshCw, CheckCircle, Clock, XCircle, Package, ArrowLeft } from "lucide-react"
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

export default function OrderDetailsPage() {
  const params = useParams()
  const orderId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const fetchOrder = async () => {
    try {
      console.log("[v0] Fetching order details for:", orderId)
      const response = await fetch(`/api/orders/${orderId}`, {
        credentials: "include",
      })
      console.log("[v0] Order details API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Order details API response data:", data)
        setOrder(data.order || data)
        setError("")
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || `Failed to load order details (${response.status})`)
        console.error("[v0] Order details API error:", response.status, errorData)
      }
    } catch (error) {
      console.error("Failed to fetch order:", error)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchOrder()
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
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-semibold mb-2">Loading Order Details</h2>
              <p className="text-muted-foreground">Please wait while we fetch your order information...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" asChild>
              <Link href="/orders">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Order Details</h1>
          </div>

          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <div className="space-y-2">
                <p className="font-medium">Error Loading Order</p>
                <p>{error}</p>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleRefresh} variant="outline" size="sm">
                    Try Again
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/orders">View All Orders</Link>
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" asChild>
              <Link href="/orders">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Order Not Found</h1>
          </div>

          <Card>
            <CardContent className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The order you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <div className="flex gap-2 justify-center">
                <Button asChild variant="outline">
                  <Link href="/orders">View All Orders</Link>
                </Button>
                <Button asChild>
                  <Link href="/shop">Continue Shopping</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(order.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/orders">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Order #{order.order_number}</h1>
              <p className="text-muted-foreground">Order details and status</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Order Status</CardTitle>
                  <Badge variant={statusInfo.variant} className={statusInfo.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Order Date:</span>
                    <div className="font-medium">{formatDate(order.created_at)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Updated:</span>
                    <div className="font-medium">{formatDate(order.updated_at)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment Status:</span>
                    <div className="font-medium capitalize">{order.payment_status || "Pending"}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Items:</span>
                    <div className="font-medium">{order.total_items}</div>
                  </div>
                </div>

                {order.status === "pending" && order.telegram_deeplink && (
                  <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Payment Required
                        </h3>
                        <p className="text-sm text-yellow-600 dark:text-yellow-300">
                          Complete your Bitcoin payment to proceed with this order
                        </p>
                        <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                          <span>Secure payment via Telegram bot</span>
                        </div>
                      </div>
                      <Button asChild size="lg" className="h-12 px-6">
                        <a href={order.telegram_deeplink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Complete Payment
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {order.status === "confirmed" && (
                  <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500/20 rounded-full">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-green-800 dark:text-green-200">Order Confirmed</h3>
                        <p className="text-sm text-green-600 dark:text-green-300">
                          Your order has been successfully confirmed and is being processed
                        </p>
                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          <span>Payment received and verified</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {order.notes && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Order Notes</h4>
                    <p className="text-sm text-muted-foreground">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items Card */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item.product_name}</h3>
                        <p className="text-sm text-muted-foreground">Product ID: {item.product_id}</p>
                        <p className="text-sm text-muted-foreground">
                          Unit Price: {order.currency_symbol}
                          {item.product_price.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Qty: {item.quantity}</p>
                        <p className="text-lg font-bold">
                          {order.currency_symbol}
                          {item.total_price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
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

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span>
                      {order.currency_symbol}
                      {order.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/orders">View All Orders</Link>
                </Button>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/shop">Continue Shopping</Link>
                </Button>
                {order.status === "pending" && order.telegram_deeplink && (
                  <Button className="w-full" asChild>
                    <a href={order.telegram_deeplink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Complete Payment
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh Status
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

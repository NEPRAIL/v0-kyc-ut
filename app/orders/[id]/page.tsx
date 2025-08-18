"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, RefreshCw, CheckCircle, Clock, XCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface OrderData {
  order: {
    id: number
    qty: number
    priceSats: number
    status: string
    createdAt: string
    btcpayInvoiceId: string | null
    product: {
      id: number
      name: string
      description: string | null
      imageUrl: string | null
    }
    variant: {
      id: number
      label: string
      isHolographic: boolean
      color: string | null
    } | null
  }
  invoice: any
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-gray-500", icon: Clock },
  unpaid: { label: "Awaiting Payment", color: "bg-yellow-500", icon: Clock },
  paid: { label: "Payment Received", color: "bg-blue-500", icon: CheckCircle },
  confirmed: { label: "Confirmed", color: "bg-green-500", icon: CheckCircle },
  expired: { label: "Expired", color: "bg-red-500", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-red-500", icon: XCircle },
}

export default function OrderPage() {
  const params = useParams()
  const orderId = params.id as string
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrderData(data)
      } else {
        console.error("Failed to fetch order")
      }
    } catch (error) {
      console.error("Error fetching order:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchOrder()
  }

  const formatPrice = (sats: number) => {
    return `${(sats / 100000000).toFixed(8)} BTC`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <Link href="/orders">
            <Button>View All Orders</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { order, invoice } = orderData
  const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Order #{order.id}</h1>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Order Status</CardTitle>
              <Badge className={`${statusInfo.color} text-white`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Order Date:</span>
                <div>{formatDate(order.createdAt)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total Amount:</span>
                <div className="font-mono">{formatPrice(order.priceSats)}</div>
              </div>
            </div>

            {order.status === "unpaid" && invoice && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Payment Required</h3>
                    <p className="text-sm text-muted-foreground">Complete your Bitcoin payment to proceed</p>
                  </div>
                  <Button asChild>
                    <a href={invoice.checkoutLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Pay Now
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {order.status === "confirmed" && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <h3 className="font-medium">Payment Confirmed</h3>
                    <p className="text-sm text-muted-foreground">Your order has been successfully completed</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                {order.product.imageUrl ? (
                  <Image
                    src={order.product.imageUrl || "/placeholder.svg"}
                    alt={order.product.name}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{order.product.name}</h3>
                {order.variant && (
                  <p className="text-sm text-muted-foreground">
                    Variant: {order.variant.label}
                    {order.variant.isHolographic && " ✨"}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Quantity: {order.qty}</p>
                <p className="text-sm font-mono">{formatPrice(order.priceSats)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/orders">View All Orders</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

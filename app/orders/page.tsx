"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, XCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Order {
  id: number
  qty: number
  priceSats: number
  status: string
  createdAt: string
  product: {
    id: number
    name: string
    imageUrl: string | null
  }
  variant: {
    id: number
    label: string
  } | null
}

const statusConfig = {
  pending: { label: "Pending", color: "bg-gray-500", icon: Clock },
  unpaid: { label: "Awaiting Payment", color: "bg-yellow-500", icon: Clock },
  paid: { label: "Payment Received", color: "bg-blue-500", icon: CheckCircle },
  confirmed: { label: "Confirmed", color: "bg-green-500", icon: CheckCircle },
  expired: { label: "Expired", color: "bg-red-500", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-red-500", icon: XCircle },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const formatPrice = (sats: number) => {
    return `${(sats / 100000000).toFixed(8)} BTC`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">My Orders</h1>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">My Orders</h1>
          <Button asChild variant="outline">
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">No Orders Yet</h2>
              <p className="text-muted-foreground mb-4">Start shopping to see your orders here</p>
              <Button asChild>
                <Link href="/shop">Browse Shop</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending
              const StatusIcon = statusInfo.icon

              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {order.product.imageUrl ? (
                          <Image
                            src={order.product.imageUrl || "/placeholder.svg"}
                            alt={order.product.name}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{order.product.name}</h3>
                            {order.variant && (
                              <p className="text-sm text-muted-foreground">Variant: {order.variant.label}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {formatDate(order.createdAt)} • Qty: {order.qty}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={`${statusInfo.color} text-white mb-2`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                            <div className="font-mono text-sm">{formatPrice(order.priceSats)}</div>
                          </div>
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/orders/${order.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

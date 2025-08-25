"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface OrderItem {
  id: string
  product_name: string
  product_id: string
  quantity: number
  product_price: number
}

interface Order {
  id: string
  order_number: string
  total_amount: number
  status: string
  payment_status?: string
  created_at: string
  items: OrderItem[]
}

export function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders/user", {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
      case "delivered":
        return "default"
      case "pending":
        return "secondary"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Order History</CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href="/orders">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No orders yet</p>
            <Button asChild>
              <Link href="/shop">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="flex-1">
                  <h3 className="font-medium">Order #{order.order_number}</h3>
                  <p className="text-sm text-muted-foreground">
                    {order.items.map((item) => item.product_name).join(", ")}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                </div>

                <div className="text-right">
                  <p className="font-medium">${order.total_amount.toFixed(2)}</p>
                </div>

                <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>

                <Button variant="outline" size="sm" asChild>
                  <Link href={`/orders/${order.order_number}`}>View</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

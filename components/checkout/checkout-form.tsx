"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { ProductImage } from "@/components/product-image"
import { ExternalLink, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export function CheckoutForm() {
  const { state, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [orderResult, setOrderResult] = useState<{
    orderId: string
    orderNumber: string
    tgDeepLink: string | null
    totalCents: number
    currency: string
  } | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleCheckout = async () => {
    if (state.items.length === 0) {
      setError("Your cart is empty")
      return
    }

    setLoading(true)
    setError("")

    try {
      console.log("[v0] Starting checkout with items:", state.items)

      const items = state.items.map((item) => ({
        productId: item.id,
        qty: item.quantity,
        price_cents: Math.round(item.price * 100),
        name: item.name,
      }))

      const response = await fetch("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items, currency: "USD" }),
      })

      console.log("[v0] Checkout API response status:", response.status)
      const data = await response.json()
      console.log("[v0] Checkout API response data:", data)

      if (response.ok) {
        clearCart()
        setOrderResult({
          orderId: data.orderId || data.order?.id,
          orderNumber: data.orderNumber || data.order?.order_number,
          tgDeepLink: data.tgDeepLink || data.telegram_deeplink,
          totalCents: data.totalCents || Math.round(state.total * 100),
          currency: data.currency || "USD",
        })
        toast({
          title: "Order created successfully!",
          description: "Your order has been created. Complete payment via Telegram.",
        })
      } else {
        setError(data.error || "Failed to create order")
        console.error("[v0] Checkout error:", data)
      }
    } catch (error) {
      console.error("[v0] Checkout network error:", error)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleTelegramPayment = () => {
    if (orderResult?.tgDeepLink) {
      window.open(orderResult.tgDeepLink, "_blank")
    }
  }

  const handleViewOrder = () => {
    if (orderResult?.orderNumber) {
      router.push(`/orders/${orderResult.orderNumber}`)
    } else if (orderResult?.orderId) {
      router.push(`/orders/${orderResult.orderId}`)
    } else {
      router.push("/orders")
    }
  }

  if (orderResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Order Created Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="space-y-2">
              <p className="font-medium">Order #{orderResult.orderNumber || orderResult.orderId}</p>
              <p className="text-sm text-muted-foreground">
                Total: {(orderResult.totalCents / 100).toFixed(2)} {orderResult.currency}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Your order has been created and is ready for payment.
              </p>
            </div>
          </div>

          {orderResult.tgDeepLink ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-medium mb-2">Complete Your Payment</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click the button below to securely complete your payment via our Telegram bot.
                </p>
              </div>

              <Button onClick={handleTelegramPayment} className="w-full" size="lg">
                <ExternalLink className="h-4 w-4 mr-2" />
                Complete Payment in Telegram
              </Button>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">Secure Bitcoin payment processing via Telegram</p>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Payment link is being generated. Please check your order details or contact support if this persists.
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t space-y-3">
            <Button variant="outline" onClick={handleViewOrder} className="w-full bg-transparent">
              View Order Details
            </Button>
            <Button variant="outline" onClick={() => router.push("/account")} className="w-full">
              Go to Account Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state.items.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">Your cart is empty</p>
          <Button onClick={() => router.push("/shop")}>Continue Shopping</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {state.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                <ProductImage productName={item.name} alt={item.name} type="thumbnail" />
                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.verificationLevel}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${item.price.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                </div>
              </div>
            ))}

            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total</span>
                <span>${state.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
              ₿
            </div>
            <div>
              <p className="font-medium">Bitcoin (BTC)</p>
              <p className="text-sm text-muted-foreground">Secure cryptocurrency payment via Telegram bot</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleCheckout} disabled={loading} className="w-full" size="lg">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating Order...
          </>
        ) : (
          `Create Order - $${state.total.toFixed(2)} USD`
        )}
      </Button>
    </div>
  )
}

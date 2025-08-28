"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { ProductImage } from "@/components/product-image"
import { ExternalLink, CheckCircle, AlertCircle, Loader2, Package, MessageCircle } from "lucide-react"

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
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        verificationLevel: item.verificationLevel,
        category: item.category,
      }))

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items }),
      })

      console.log("[v0] Orders API response status:", response.status)
      const data = await response.json()
      console.log("[v0] Orders API response data:", data)

      if (response.ok && data.success) {
        clearCart()
        setOrderResult({
          orderId: data.order.id,
          orderNumber: data.order.id,
          tgDeepLink: data.tgDeepLink,
          totalCents: Math.round(data.order.total * 100),
          currency: "USD",
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

  const handleConfirmOrder = async () => {
    if (!orderResult?.orderId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${orderResult.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "confirmed" }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        toast({
          title: "Order confirmed!",
          description: "Your order has been confirmed successfully.",
        })
        handleViewOrder()
      } else {
        toast({
          title: "Confirmation failed",
          description: data.error || "Failed to confirm order",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Order confirmation error:", error)
      toast({
        title: "Confirmation failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
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
      <div className="space-y-6">
        <Card className="shadow-lg border-0 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-green-700 dark:text-green-400">
              <div className="p-2 bg-green-500/20 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              Order Created Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-white/80 dark:bg-background/80 rounded-xl border border-green-200 dark:border-green-800 backdrop-blur">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Order Number:</span>
                  <span className="font-mono font-bold text-lg">#{orderResult.orderNumber || orderResult.orderId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Amount:</span>
                  <span className="font-bold text-xl text-green-600">
                    {(orderResult.totalCents / 100).toFixed(2)} {orderResult.currency}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>Your order has been created and is ready for payment</span>
                </div>
              </div>
            </div>

            {orderResult.tgDeepLink ? (
              <div className="space-y-6">
                <div className="text-center space-y-3">
                  <h3 className="font-semibold text-lg">Complete Your Payment</h3>
                  <p className="text-muted-foreground">
                    Click the button below to securely complete your Bitcoin payment via our Telegram bot.
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      ₿
                    </div>
                    <div>
                      <p className="font-medium">Bitcoin Payment</p>
                      <p className="text-sm text-muted-foreground">Secure cryptocurrency processing</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button onClick={handleTelegramPayment} className="h-12 text-base font-medium" size="lg">
                      <ExternalLink className="h-5 w-5 mr-2" />
                      Pay via Telegram
                    </Button>
                    <Button
                      onClick={handleConfirmOrder}
                      variant="outline"
                      className="h-12 text-base font-medium bg-transparent"
                      size="lg"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-5 w-5 mr-2" />
                      )}
                      Confirm Order
                    </Button>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    🔒 Secure Bitcoin payment processing • 🤖 Automated order confirmation • ⚡ Real-time updates
                  </p>
                </div>
              </div>
            ) : (
              <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  Payment link is being generated. Please check your order details or contact support if this persists.
                </AlertDescription>
              </Alert>
            )}

            <div className="pt-6 border-t space-y-3">
              <Button
                variant="outline"
                onClick={handleViewOrder}
                className="w-full h-11 bg-transparent hover:bg-muted/50"
              >
                <Package className="h-4 w-4 mr-2" />
                View Order Details
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => router.push("/account")} className="h-11 bg-transparent">
                  Account Dashboard
                </Button>
                <Button variant="outline" onClick={() => router.push("/orders")} className="h-11 bg-transparent">
                  All Orders
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-accent" />
              What Happens Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium">Complete Payment</p>
                  <p className="text-sm text-muted-foreground">Use the Telegram bot to securely pay with Bitcoin</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium">Automatic Confirmation</p>
                  <p className="text-sm text-muted-foreground">
                    Your order will be confirmed automatically after payment
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium">Real-time Updates</p>
                  <p className="text-sm text-muted-foreground">Get instant notifications via Telegram and email</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
                <ProductImage productName={item.name} type="thumbnail" />
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

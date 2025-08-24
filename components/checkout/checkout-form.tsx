"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { ProductImage } from "@/components/product-image"

export function CheckoutForm() {
  const { state, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
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
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: state.items }),
      })

      const data = await response.json()

      if (response.ok) {
        clearCart()
        toast({
          title: "Orders created",
          description: "Your orders have been created. Redirecting to payment...",
        })

        // Redirect to first order's payment page
        if (data.orders && data.orders.length > 0) {
          router.push(`/orders/${data.orders[0].id}`)
        }
      } else {
        setError(data.error || "Failed to create orders")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
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
                  <p className="font-medium">${item.price}</p>
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
              <p className="text-sm text-muted-foreground">Secure cryptocurrency payment</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleCheckout} disabled={loading} className="w-full" size="lg">
        {loading ? "Creating Orders..." : `Pay ${state.total.toFixed(2)} USD with Bitcoin`}
      </Button>
    </div>
  )
}

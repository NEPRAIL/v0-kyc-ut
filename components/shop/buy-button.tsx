"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Loader2, ExternalLink } from "lucide-react"

interface BuyButtonProps {
  productId: number
  variantId?: number | null
  priceSats: number
  stock: number
  disabled?: boolean
}

export function BuyButton({ productId, variantId, priceSats, stock, disabled }: BuyButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const formatPrice = (sats: number) => {
    return `${(sats / 100000000).toFixed(8)} BTC`
  }

  const handleBuy = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          variantId,
          qty: 1,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to BTCPay checkout
        window.open(data.checkoutLink, "_blank")
        // Also redirect to order page
        router.push(`/orders/${data.orderId}`)
      } else {
        alert(data.error || "Failed to create order")
      }
    } catch (error) {
      console.error("Buy error:", error)
      alert("Failed to create order")
    } finally {
      setLoading(false)
    }
  }

  if (stock === 0) {
    return (
      <Button disabled className="w-full">
        Out of Stock
      </Button>
    )
  }

  return (
    <Button onClick={handleBuy} disabled={disabled || loading} className="w-full" size="lg">
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Creating Order...
        </>
      ) : (
        <>
          <ExternalLink className="h-4 w-4 mr-2" />
          Buy Now - {formatPrice(priceSats)}
        </>
      )}
    </Button>
  )
}

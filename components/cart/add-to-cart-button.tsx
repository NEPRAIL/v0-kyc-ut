"use client"

import { useCart } from "@/contexts/cart-context"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

interface AddToCartButtonProps {
  product: {
    id: string
    name: string
    price: number
    verificationLevel: string
    category: string
  }
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "default" | "lg"
  className?: string
}

export function AddToCartButton({
  product,
  variant = "default",
  size = "default",
  className = "",
}: AddToCartButtonProps) {
  const { addItem } = useCart()
  const { toast } = useToast()
  const [isAdded, setIsAdded] = useState(false)

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      verificationLevel: product.verificationLevel,
      category: product.category,
    })

    toast({
      title: "Added to cart!",
      description: `${product.name} has been added to your cart.`,
      variant: "success",
    })

    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2000)
  }

  return (
    <Button
      onClick={handleAddToCart}
      variant={variant}
      size={size}
      className={`transition-all duration-300 ${className}`}
      disabled={isAdded}
    >
      {isAdded ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Added!
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </>
      )}
    </Button>
  )
}

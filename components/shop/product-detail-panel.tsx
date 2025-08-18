"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, ShoppingCart } from "lucide-react"
import Image from "next/image"

interface ProductDetailPanelProps {
  productId: string | null
  onClose: () => void
}

interface ProductDetail {
  product: {
    id: string
    slug: string
    name: string
    description: string | null
    imageUrl: string | null
    rarity: { name: string; color: string } | null
    season: { name: string } | null
  }
  variants: Array<{
    id: string
    name: string
    description: string | null
    imageUrl: string | null
    listings: {
      id: string
      price: string
      stock: number
    } | null
  }>
  baseListings: Array<{
    id: string
    price: string
    stock: number
  }>
}

export function ProductDetailPanel({ productId, onClose }: ProductDetailPanelProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!productId) {
      setProduct(null)
      return
    }

    setLoading(true)
    fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data)
        setSelectedVariant(null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [productId])

  if (!productId) return null

  if (loading) {
    return (
      <div className="w-96 bg-card border-l border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="aspect-square bg-muted rounded"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) return null

  const formatPrice = (price: string) => {
    return `$${Number.parseFloat(price).toFixed(2)}`
  }

  const getLowestPrice = () => {
    const prices = []

    // Add base listing prices
    product.baseListings.forEach((listing) => {
      if (listing.stock > 0) {
        prices.push(Number.parseFloat(listing.price))
      }
    })

    // Add variant listing prices
    product.variants.forEach((variant) => {
      if (variant.listings && variant.listings.stock > 0) {
        prices.push(Number.parseFloat(variant.listings.price))
      }
    })

    return prices.length > 0 ? Math.min(...prices).toString() : null
  }

  const getCurrentListing = () => {
    if (selectedVariant) {
      const variant = product.variants.find((v) => v.id === selectedVariant)
      return variant?.listings
    }
    return product.baseListings[0] || null
  }

  const lowestPrice = getLowestPrice()
  const currentListing = getCurrentListing()

  const handleBuy = () => {
    alert("Purchase functionality will be available soon!")
  }

  return (
    <div className="w-96 bg-card border-l border-border flex flex-col">
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold leading-tight">{product.product.name}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="aspect-square relative mb-4 bg-muted rounded-lg overflow-hidden">
          {product.product.imageUrl ? (
            <Image
              src={product.product.imageUrl || "/placeholder.svg?height=400&width=400"}
              alt={product.product.name}
              fill
              className="object-cover"
              sizes="384px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span>No Image</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {product.product.rarity && (
              <Badge style={{ backgroundColor: product.product.rarity.color }} className="text-white">
                {product.product.rarity.name}
              </Badge>
            )}
            {product.product.season && <Badge variant="outline">{product.product.season.name}</Badge>}
          </div>

          {product.product.description && (
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{product.product.description}</p>
            </div>
          )}

          {product.variants.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Variants</h3>
              <Select
                value={selectedVariant || "base"}
                onValueChange={(value) => setSelectedVariant(value === "base" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select variant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base Version</SelectItem>
                  {product.variants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <div>
            <h3 className="font-medium mb-2">Pricing</h3>
            {lowestPrice && (
              <div className="text-sm text-muted-foreground mb-2">
                Lowest Price: <span className="font-mono text-green-400">{formatPrice(lowestPrice)}</span>
              </div>
            )}
            {currentListing ? (
              <div className="space-y-2">
                <div className="text-lg font-mono text-green-400">{formatPrice(currentListing.price)}</div>
                <div className="text-sm text-muted-foreground">Stock: {currentListing.stock}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Not available for purchase</div>
            )}
          </div>
        </div>
      </div>

      {currentListing && currentListing.stock > 0 && (
        <div className="p-6 border-t border-border">
          <Button onClick={handleBuy} className="w-full" size="lg">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Buy Now - {formatPrice(currentListing.price)}
          </Button>
        </div>
      )}
    </div>
  )
}

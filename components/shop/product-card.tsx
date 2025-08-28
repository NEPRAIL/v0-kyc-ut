"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

interface ProductCardProps {
  product: {
    id: string
    slug: string
    name: string
    imageUrl: string | null
    rarity: { name: string; color: string } | null
    lowestPrice: string | null
    totalStock: number | null
    hasVariants: boolean
  }
  isSelected?: boolean
  onClick?: () => void
}

export function ProductCard({ product, isSelected, onClick }: ProductCardProps) {
  const formatPrice = (price: string) => {
    return `$${Number.parseFloat(price).toFixed(2)}`
  }

  return (
    <Card
      className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="aspect-square relative mb-3 bg-muted rounded-lg overflow-hidden">
          {product.imageUrl ? (
            <Image
              src={
                product.imageUrl ||
                "https://dummyimage.com/400x400/1f2937/ffffff.png&text=Placeholder"
              }
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-xs">No Image</span>
            </div>
          )}
          {product.rarity && (
            <Badge
              className="absolute top-2 left-2 text-xs text-white"
              style={{ backgroundColor: product.rarity.color }}
            >
              {product.rarity.name}
            </Badge>
          )}
          {product.hasVariants && (
            <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
              Variants
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="font-medium text-sm leading-tight line-clamp-2">{product.name}</h3>
          <div className="flex items-center justify-between text-xs">
            {product.lowestPrice ? (
              <span className="font-mono text-green-400">{formatPrice(product.lowestPrice)}</span>
            ) : (
              <span className="text-muted-foreground">Not for sale</span>
            )}
            {product.totalStock && <span className="text-muted-foreground">Stock: {product.totalStock}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

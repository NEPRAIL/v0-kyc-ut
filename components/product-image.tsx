"use client"

import Image from "next/image"
import { useState } from "react"

interface ProductImageProps {
  src: string
  alt: string
  type: "thumbnail" | "detail"
  className?: string
}

export function ProductImage({ src, alt, type, className = "" }: ProductImageProps) {
  const [imageError, setImageError] = useState(false)

  const size = type === "thumbnail" ? 120 : 300
  const fallbackSrc = type === "thumbnail" ? "/generic-product-logo.png" : "/modern-tech-product.png"

  const finalSrc = imageError || !src ? fallbackSrc : src

  return (
    <Image
      src={finalSrc || "/placeholder.svg"}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      onError={() => setImageError(true)}
      priority={type === "detail"}
    />
  )
}

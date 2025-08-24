"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddToCartButton } from "@/components/cart/add-to-cart-button"
import { Breadcrumb } from "@/components/navigation/breadcrumb"
import { ProductGridSkeleton } from "@/components/loading/product-skeleton"
import { ScrollToTop } from "@/components/ui/scroll-to-top"
import { Star, Search, Filter, Grid, List, X } from "lucide-react"
import Link from "next/link"
import { allProducts, productCategories, getSortedProducts, verificationLevels } from "@/lib/data/products"
import { ProductImage } from "@/components/product-image"

export default function ShopPage() {
  const searchParams = useSearchParams()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState(searchParams.get("category") || "all")
  const [verificationLevel, setVerificationLevel] = useState("all")
  const [sortBy, setSortBy] = useState("price-asc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  useEffect(() => {
    const categoryParam = searchParams.get("category")
    const searchParam = searchParams.get("search")

    if (categoryParam) {
      setCategory(categoryParam)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }

    if (searchParam) {
      setSearch(searchParam)
    }

    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [searchParams])

  useEffect(() => {
    const savedViewMode = localStorage.getItem("kycut-view-mode")
    if (savedViewMode && (savedViewMode === "grid" || savedViewMode === "list")) {
      setViewMode(savedViewMode)
    }
  }, [])

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode)
    localStorage.setItem("kycut-view-mode", mode)
  }

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleVerificationChange = (newLevel: string) => {
    setVerificationLevel(newLevel)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === "all" || product.category === category
    const matchesVerification =
      verificationLevel === "all" || product.verificationLevel.toLowerCase() === verificationLevel.toLowerCase()
    return matchesSearch && matchesCategory && matchesVerification
  })

  const sortedProducts = getSortedProducts(filteredProducts, sortBy)

  const clearSearch = () => {
    setSearch("")
    // Update URL to remove search parameter
    const url = new URL(window.location.href)
    url.searchParams.delete("search")
    window.history.replaceState({}, "", url.toString())
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">KYCut Marketplace</h1>
          <p className="text-xl text-muted-foreground">Browse 100+ pre-verified accounts across 7 categories</p>

          {search && (
            <div className="mt-4 flex items-center gap-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <span className="text-sm text-muted-foreground">Searching for:</span>
              <Badge variant="secondary" className="flex items-center gap-2">
                "{search}"
                <Button variant="ghost" size="sm" onClick={clearSearch} className="h-4 w-4 p-0 hover:bg-transparent">
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="card-professional rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg border border-white/10 animate-in fade-in-0 slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-10 bg-input text-white placeholder:text-muted-foreground border-white/20 h-10 sm:h-11"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-white/10"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="bg-input text-white border-white/20 h-10 sm:h-11">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="card-professional border-white/10">
                <SelectItem value="all">All Categories</SelectItem>
                {productCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={verificationLevel} onValueChange={handleVerificationChange}>
              <SelectTrigger className="bg-input text-white border-white/20 h-10 sm:h-11">
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent className="card-professional border-white/10">
                <SelectItem value="all">All Levels</SelectItem>
                {Object.keys(verificationLevels).map((level) => (
                  <SelectItem key={level} value={level.toLowerCase()}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="bg-input text-white border-white/20 h-10 sm:h-11">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="card-professional border-white/10">
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="name-asc">Name: A to Z</SelectItem>
                <SelectItem value="name-desc">Name: Z to A</SelectItem>
                <SelectItem value="verification-asc">Verification: Basic to Platinum</SelectItem>
                <SelectItem value="verification-desc">Verification: Platinum to Basic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="text-sm text-muted-foreground">
              {isLoading ? "Loading..." : `${sortedProducts.length} accounts found`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewModeChange("grid")}
                className="px-3 py-2 bg-primary hover:bg-primary/90 text-white border-white/20 transition-all duration-200"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewModeChange("list")}
                className="px-3 py-2 bg-primary hover:bg-primary/90 text-white border-white/20 transition-all duration-200"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : sortedProducts.length > 0 ? (
          <div
            className={`animate-in fade-in-0 slide-in-from-bottom-4 duration-700 ${
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
                : "space-y-4 sm:space-y-6"
            }`}
          >
            {sortedProducts.map((product, index) => {
              const categoryInfo = productCategories.find((cat) => cat.id === product.category)

              const highlightSearch = (text: string) => {
                if (!search) return text
                const regex = new RegExp(`(${search})`, "gi")
                const parts = text.split(regex)
                return parts.map((part, index) =>
                  regex.test(part) ? (
                    <mark key={index} className="bg-primary/30 text-primary-foreground rounded px-1">
                      {part}
                    </mark>
                  ) : (
                    part
                  ),
                )
              }

              return (
                <Card
                  key={product.id}
                  className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 card-professional overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6 sm:p-8">
                    <Link
                      href={`/product/${product.id}`}
                      onClick={() => {
                        setTimeout(() => {
                          window.scrollTo({ top: 0, behavior: "smooth" })
                        }, 100)
                      }}
                      className="block cursor-pointer"
                    >
                      <div className="mb-6 sm:mb-8 flex items-center justify-center">
                        <ProductImage
                          productName={product.name}
                          type="thumbnail"
                          className="transition-all duration-300 group-hover:scale-110"
                        />
                      </div>

                      <div className="space-y-4 sm:space-y-6">
                        <div className="flex items-center justify-between">
                          <Badge
                            className={`${product.verificationColor} text-white font-semibold shadow-md px-2 sm:px-3 py-1 text-xs sm:text-sm transition-all duration-300 group-hover:scale-105`}
                          >
                            {product.verificationLevel}
                          </Badge>
                          <span className="text-xs sm:text-sm text-muted-foreground font-medium bg-secondary/20 backdrop-blur-sm px-2 sm:px-3 py-1 rounded-full transition-all duration-300 group-hover:bg-secondary/30">
                            {categoryInfo?.name || product.category}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3 transition-colors duration-300 group-hover:text-primary">
                            {highlightSearch(product.name)}
                          </h3>
                          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                            Pre-verified {product.name} account with {product.verificationLevel.toLowerCase()}{" "}
                            verification completed. No ban risk, fast delivery.
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-white/10">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-2xl sm:text-3xl font-bold text-primary">${product.price}</span>
                            <div className="flex items-center text-yellow-500">
                              <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                              <span className="text-xs sm:text-sm ml-1 text-muted-foreground font-medium">4.9</span>
                            </div>
                          </div>
                          <div className="text-xs sm:text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            Click to view →
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div className="mt-4 pt-4 border-t border-white/10">
                      <AddToCartButton
                        product={{
                          id: product.id,
                          name: product.name,
                          price: product.price,
                          verificationLevel: product.verificationLevel,
                          category: categoryInfo?.name || product.category,
                        }}
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <Filter className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">No accounts found</h3>
            <p className="text-muted-foreground px-4 sm:px-0">Try adjusting your search or filters</p>
          </div>
        )}

        <ScrollToTop />
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, Search, Filter, Grid, List } from "lucide-react"
import Link from "next/link"
import { allProducts, productCategories } from "@/lib/data/products"

export default function ShopPage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [rarity, setRarity] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const filteredProducts = allProducts
    .filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = category === "all" || product.category === category
      const matchesRarity = rarity === "all" || product.rarity.toLowerCase() === rarity.toLowerCase()
      return matchesSearch && matchesCategory && matchesRarity
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price
        case "price-high":
          return b.price - a.price
        case "name":
          return a.name.localeCompare(b.name)
        default:
          return a.name.localeCompare(b.name)
      }
    })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">KYCut Marketplace</h1>
          <p className="text-xl text-muted-foreground">Browse 100+ pre-verified accounts across 7 categories</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background h-10 sm:h-11"
              />
            </div>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-background h-10 sm:h-11">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {productCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={rarity} onValueChange={setRarity}>
              <SelectTrigger className="bg-background h-10 sm:h-11">
                <SelectValue placeholder="Rarity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rarities</SelectItem>
                <SelectItem value="common">Common</SelectItem>
                <SelectItem value="uncommon">Uncommon</SelectItem>
                <SelectItem value="rare">Rare</SelectItem>
                <SelectItem value="epic">Epic</SelectItem>
                <SelectItem value="legendary">Legendary</SelectItem>
                <SelectItem value="mythic">Mythic</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-background h-10 sm:h-11">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="text-sm text-muted-foreground">{filteredProducts.length} accounts found</div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="px-3 py-2"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="px-3 py-2"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
                : "space-y-4 sm:space-y-6"
            }
          >
            {filteredProducts.map((product) => {
              const getGradient = (rarity: string) => {
                switch (rarity) {
                  case "Common":
                    return "from-gray-500 to-gray-700"
                  case "Uncommon":
                    return "from-green-500 to-green-700"
                  case "Rare":
                    return "from-blue-500 to-blue-700"
                  case "Epic":
                    return "from-purple-500 to-purple-700"
                  case "Legendary":
                    return "from-orange-500 to-orange-700"
                  case "Mythic":
                    return "from-red-500 to-red-700"
                  default:
                    return "from-gray-500 to-gray-700"
                }
              }

              const categoryInfo = productCategories.find((cat) => cat.id === product.category)

              return (
                <Card
                  key={product.id}
                  className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 bg-card border-0 shadow-lg overflow-hidden"
                >
                  <CardContent className="p-6 sm:p-8">
                    <div
                      className={`aspect-square bg-gradient-to-br ${getGradient(product.rarity)} rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 flex items-center justify-center shadow-inner relative overflow-hidden transition-all duration-300 group-hover:shadow-2xl`}
                    >
                      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/20" />
                      <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white relative z-10 group-hover:scale-110 transition-transform duration-300">
                        {categoryInfo?.emoji || "🏪"}
                      </div>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-center justify-between">
                        <Badge
                          className={`${product.rarityColor} text-white font-semibold shadow-md px-2 sm:px-3 py-1 text-xs sm:text-sm transition-all duration-300 group-hover:scale-105`}
                        >
                          {product.rarity}
                        </Badge>
                        <span className="text-xs sm:text-sm text-muted-foreground font-medium bg-muted px-2 sm:px-3 py-1 rounded-full transition-all duration-300 group-hover:bg-muted/80">
                          {categoryInfo?.name || product.category}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-card-foreground mb-2 sm:mb-3 transition-colors duration-300 group-hover:text-primary">
                          {product.name}
                        </h3>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          Pre-verified {product.name} account with KYC completed. No ban risk, fast delivery.
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-border">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-2xl sm:text-3xl font-bold text-card-foreground">${product.price}</span>
                          <div className="flex items-center text-yellow-500">
                            <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                            <span className="text-xs sm:text-sm ml-1 text-muted-foreground font-medium">4.9</span>
                          </div>
                        </div>
                        <Button
                          asChild
                          size="sm"
                          className="bg-secondary hover:bg-secondary/90 shadow-md px-4 sm:px-6 text-xs sm:text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
                        >
                          <Link href={`/product/${product.id}`}>View Details</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16">
            <Filter className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">No accounts found</h3>
            <p className="text-muted-foreground px-4 sm:px-0">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

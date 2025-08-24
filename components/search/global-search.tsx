"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, X, Clock, TrendingUp } from "lucide-react"
import { allProducts, productCategories } from "@/lib/data/products"
import { ProductImage } from "@/components/product-image"

interface SearchResult {
  id: string
  name: string
  category: string
  price: number
  verificationLevel: string
  type: "product" | "category"
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("kycut-recent-searches")
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.error("Failed to load recent searches:", error)
      }
    }
  }, [])

  // Handle search
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    const timer = setTimeout(() => {
      const productResults: SearchResult[] = allProducts
        .filter((product) => product.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6)
        .map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          verificationLevel: product.verificationLevel,
          type: "product" as const,
        }))

      const categoryResults: SearchResult[] = productCategories
        .filter((category) => category.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map((category) => ({
          id: category.id,
          name: category.name,
          category: category.id,
          price: 0,
          verificationLevel: "",
          type: "category" as const,
        }))

      setResults([...productResults, ...categoryResults])
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault()
        setIsOpen(true)
        inputRef.current?.focus()
      }
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const saveRecentSearch = (searchTerm: string) => {
    const updated = [searchTerm, ...recentSearches.filter((s) => s !== searchTerm)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem("kycut-recent-searches", JSON.stringify(updated))
  }

  const handleSearch = (searchTerm: string) => {
    if (searchTerm.trim()) {
      saveRecentSearch(searchTerm.trim())
      router.push(`/shop?search=${encodeURIComponent(searchTerm.trim())}`)
      setIsOpen(false)
      setQuery("")
    }
  }

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "product") {
      saveRecentSearch(result.name)
      router.push(`/product/${result.id}`)
    } else {
      saveRecentSearch(result.name)
      router.push(`/shop?category=${result.id}`)
    }
    setIsOpen(false)
    setQuery("")
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem("kycut-recent-searches")
  }

  const popularSearches = ["Binance", "PayPal", "Chase", "Revolut", "Coinbase"]

  return (
    <div ref={searchRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 100)
        }}
        className="hidden sm:flex p-2 text-white transition-all duration-300 hover:scale-110 hover:bg-white/10"
      >
        <Search className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="flex items-start justify-center min-h-screen pt-[10vh] px-4">
            <div className="w-full max-w-2xl card-professional rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
              {/* Search Input */}
              <div className="p-6 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    ref={inputRef}
                    placeholder="Search accounts, categories..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch(query)
                      }
                    }}
                    className="pl-12 pr-12 h-14 text-lg bg-input text-white placeholder:text-muted-foreground border-white/20 rounded-xl"
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {query && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuery("")}
                        className="h-8 w-8 p-0 hover:bg-white/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-2 text-xs text-muted-foreground">
                      ESC
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Search Results */}
              <div className="max-h-96 overflow-y-auto">
                {query.length >= 2 ? (
                  <div className="p-4">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : results.length > 0 ? (
                      <div className="space-y-2">
                        {results.map((result) => (
                          <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleResultClick(result)}
                            className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                          >
                            {result.type === "product" ? (
                              <ProductImage productName={result.name} type="thumbnail" className="w-12 h-12" />
                            ) : (
                              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                                <Search className="w-6 h-6 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-white truncate">{result.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {result.type === "product" ? (
                                  <span>
                                    ${result.price} • {result.verificationLevel}
                                  </span>
                                ) : (
                                  <span>Category</span>
                                )}
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {result.type === "product" ? "Account" : "Category"}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No results found for "{query}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 space-y-6">
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-white flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Recent Searches
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearRecentSearches}
                            className="text-xs text-muted-foreground hover:text-white"
                          >
                            Clear
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {recentSearches.map((search, index) => (
                            <button
                              key={index}
                              onClick={() => handleSearch(search)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-white"
                            >
                              {search}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Popular Searches */}
                    <div>
                      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Popular Searches
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {popularSearches.map((search) => (
                          <button
                            key={search}
                            onClick={() => handleSearch(search)}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-sm text-white transition-colors"
                          >
                            {search}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

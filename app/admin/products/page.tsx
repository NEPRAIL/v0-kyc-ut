"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/admin/data-table"
import { ProductForm } from "@/components/admin/product-form"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface Product {
  id: number
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  redeemable: boolean
  series: string | null
  season: { id: number; name: string } | null
  rarity: { id: number; name: string } | null
  createdAt: string
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      })
      if (debouncedSearch) params.set("search", debouncedSearch)

      const response = await fetch(`/api/admin/products?${params}`)
      const data = await response.json()

      setProducts(data.products || [])
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 })
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleCreateProduct = async (data: any) => {
    const response = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to create product")
    }

    setShowForm(false)
    fetchProducts()
  }

  const handleUpdateProduct = async (data: any) => {
    if (!editingProduct) return

    const response = await fetch(`/api/admin/products/${editingProduct.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to update product")
    }

    setEditingProduct(null)
    setShowForm(false)
    fetchProducts()
  }

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete product")
      }

      fetchProducts()
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete product")
    }
  }

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (product: Product) => (
        <div>
          <div className="font-medium">{product.name}</div>
          <div className="text-sm text-muted-foreground">{product.slug}</div>
        </div>
      ),
    },
    {
      key: "season",
      label: "Season",
      render: (product: Product) => product.season?.name || "-",
    },
    {
      key: "rarity",
      label: "Rarity",
      render: (product: Product) => product.rarity?.name || "-",
    },
    {
      key: "series",
      label: "Series",
      render: (product: Product) => product.series || "-",
    },
    {
      key: "redeemable",
      label: "Redeemable",
      render: (product: Product) => (product.redeemable ? <Badge>Yes</Badge> : "-"),
    },
  ]

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{editingProduct ? "Edit Product" : "Create Product"}</h1>
        </div>
        <ProductForm
          product={editingProduct}
          onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
          onCancel={() => {
            setShowForm(false)
            setEditingProduct(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Product
        </Button>
      </div>

      <DataTable
        data={products}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search products..."
        onSearch={setSearch}
        pagination={pagination}
        onPageChange={setPage}
        actions={(product) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingProduct(product)
                setShowForm(true)
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      />
    </div>
  )
}

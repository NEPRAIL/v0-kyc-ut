"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/admin/data-table"
import { useDebounce } from "@/hooks/use-debounce"

interface OrderRow {
  id: string
  userId: string
  totalCents: number
  status: string
  createdAt: string
  itemsCount?: number
}

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })

  const debouncedSearch = useDebounce(search, 300)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (debouncedSearch) params.set("search", debouncedSearch)
      const res = await fetch(`/api/admin/orders?${params}`)
      const data = await res.json()
      setRows(data.orders || [])
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 })
    } catch (e) {
      console.error("[admin] orders fetch error", e)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const columns = [
    { key: "id", label: "Order ID" },
    { key: "userId", label: "User" },
    { key: "status", label: "Status" },
    {
      key: "totalCents",
      label: "Total",
      render: (o: OrderRow) => `$${(o.totalCents / 100).toFixed(2)}`,
    },
    { key: "itemsCount", label: "Items" },
    { key: "createdAt", label: "Created" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Orders</h1>
        <Button variant="outline" size="sm" onClick={() => fetchOrders()}>
          Refresh
        </Button>
      </div>

      <DataTable
        data={rows as any}
        columns={columns as any}
        loading={loading}
        searchPlaceholder="Search by order ID or user ID..."
        onSearch={setSearch}
        pagination={pagination}
        onPageChange={setPage}
      />
    </div>
  )
}

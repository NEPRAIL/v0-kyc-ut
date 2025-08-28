"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/admin/data-table"
import { useDebounce } from "@/hooks/use-debounce"

interface LinkRow {
  telegramUserId: number
  userId: string
  telegramUsername: string | null
  linkedVia: string
  isRevoked: boolean
  lastSeenAt?: string
  createdAt?: string
}

export default function AdminTelegramPage() {
  const [rows, setRows] = useState<LinkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })

  const debouncedSearch = useDebounce(search, 300)

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (debouncedSearch) params.set("search", debouncedSearch)
      const res = await fetch(`/api/admin/telegram-links?${params}`)
      const data = await res.json()
      setRows(data.links || [])
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 })
    } catch (e) {
      console.error("[admin] telegram fetch error", e)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const columns = [
    { key: "telegramUserId", label: "Telegram ID" },
    {
      key: "telegramUsername",
      label: "Username",
      render: (r: LinkRow) => (r.telegramUsername ? `@${r.telegramUsername}` : "-"),
    },
    { key: "userId", label: "User" },
    { key: "linkedVia", label: "Linked Via" },
    { key: "isRevoked", label: "Active", render: (r: LinkRow) => (r.isRevoked ? "No" : "Yes") },
    { key: "lastSeenAt", label: "Last Seen" },
    { key: "createdAt", label: "Created" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Telegram Links</h1>
        <Button variant="outline" size="sm" onClick={() => fetchLinks()}>
          Refresh
        </Button>
      </div>

      <DataTable
        data={rows as any}
        columns={columns as any}
        loading={loading}
        searchPlaceholder="Search by Telegram ID or username..."
        onSearch={setSearch}
        pagination={pagination}
        onPageChange={setPage}
      />
    </div>
  )
}

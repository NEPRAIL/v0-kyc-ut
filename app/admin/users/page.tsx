"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/admin/data-table"
import { useDebounce } from "@/hooks/use-debounce"

interface UserRow {
  id: string
  username: string
  email: string
  emailVerified?: boolean
  createdAt?: string
  telegram?: {
    telegramUserId?: number
    telegramUsername?: string | null
  } | null
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })

  const debouncedSearch = useDebounce(search, 300)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" })
      if (debouncedSearch) params.set("search", debouncedSearch)
      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      setRows(data.users || [])
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 })
    } catch (e) {
      console.error("[admin] users fetch error", e)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const columns = [
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    {
      key: "telegram",
      label: "Telegram",
      render: (u: UserRow) =>
        u.telegram?.telegramUserId ? `@${u.telegram?.telegramUsername || u.telegram.telegramUserId}` : "-",
    },
    { key: "createdAt", label: "Created" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users</h1>
        <Button variant="outline" size="sm" onClick={() => fetchUsers()}>
          Refresh
        </Button>
      </div>

      <DataTable
        data={rows as any}
        columns={columns as any}
        loading={loading}
        searchPlaceholder="Search users..."
        onSearch={setSearch}
        pagination={pagination}
        onPageChange={setPage}
      />
    </div>
  )
}

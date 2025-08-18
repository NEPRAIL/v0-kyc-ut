"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface SearchBarProps {
  onSearchChange: (search: string) => void
}

export function SearchBar({ onSearchChange }: SearchBarProps) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    onSearchChange(debouncedSearch)
  }, [debouncedSearch, onSearchChange])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        placeholder="Search by Item or Name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-10 bg-muted/50"
      />
    </div>
  )
}

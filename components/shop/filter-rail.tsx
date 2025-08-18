"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface FilterData {
  seasons: Array<{ id: string; name: string; count: number }>
  rarities: Array<{ id: string; name: string; color: string; count: number }>
  variants: {
    total: number
  }
}

interface FilterRailProps {
  onFiltersChange: (filters: {
    seasons: string[]
    rarities: string[]
  }) => void
}

export function FilterRail({ onFiltersChange }: FilterRailProps) {
  const [filterData, setFilterData] = useState<FilterData | null>(null)
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([])
  const [selectedRarities, setSelectedRarities] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/filters")
      .then((res) => res.json())
      .then(setFilterData)
      .catch(console.error)
  }, [])

  useEffect(() => {
    onFiltersChange({
      seasons: selectedSeasons,
      rarities: selectedRarities,
    })
  }, [selectedSeasons, selectedRarities, onFiltersChange])

  const handleSeasonChange = (seasonId: string, checked: boolean) => {
    setSelectedSeasons((prev) => (checked ? [...prev, seasonId] : prev.filter((id) => id !== seasonId)))
  }

  const handleRarityChange = (rarityId: string, checked: boolean) => {
    setSelectedRarities((prev) => (checked ? [...prev, rarityId] : prev.filter((id) => id !== rarityId)))
  }

  if (!filterData) {
    return (
      <div className="w-64 bg-card border-r border-border p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-20"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-muted rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-card border-r border-border p-4 space-y-6">
      <div>
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Seasons</h3>
        <div className="space-y-2">
          {filterData.seasons.map((season) => (
            <div key={season.id} className="flex items-center space-x-2">
              <Checkbox
                id={`season-${season.id}`}
                checked={selectedSeasons.includes(season.id)}
                onCheckedChange={(checked) => handleSeasonChange(season.id, checked as boolean)}
              />
              <Label htmlFor={`season-${season.id}`} className="text-sm flex-1 cursor-pointer">
                {season.name}
              </Label>
              <span className="text-xs text-muted-foreground">{season.count}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">Rarity</h3>
        <div className="space-y-2">
          {filterData.rarities.map((rarity) => (
            <div key={rarity.id} className="flex items-center space-x-2">
              <Checkbox
                id={`rarity-${rarity.id}`}
                checked={selectedRarities.includes(rarity.id)}
                onCheckedChange={(checked) => handleRarityChange(rarity.id, checked as boolean)}
              />
              <Label htmlFor={`rarity-${rarity.id}`} className="text-sm flex-1 cursor-pointer">
                <span
                  className="inline-block w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: rarity.color }}
                ></span>
                {rarity.name}
              </Label>
              <span className="text-xs text-muted-foreground">{rarity.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

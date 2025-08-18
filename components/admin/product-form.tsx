"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProductFormProps {
  product?: any
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    imageUrl: "",
    seasonId: "",
    rarityId: "",
    redeemable: false,
    series: "",
  })
  const [seasons, setSeasons] = useState<Array<{ id: number; name: string }>>([])
  const [rarities, setRarities] = useState<Array<{ id: number; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Load seasons and rarities
    Promise.all([
      fetch("/api/admin/seasons").then((res) => res.json()),
      fetch("/api/admin/rarities").then((res) => res.json()),
    ])
      .then(([seasonsData, raritiesData]) => {
        setSeasons(seasonsData.seasons || [])
        setRarities(raritiesData.rarities || [])
      })
      .catch(console.error)

    // Pre-fill form if editing
    if (product) {
      setFormData({
        name: product.name || "",
        slug: product.slug || "",
        description: product.description || "",
        imageUrl: product.imageUrl || "",
        seasonId: product.season?.id?.toString() || "0",
        rarityId: product.rarity?.id?.toString() || "0",
        redeemable: product.redeemable || false,
        series: product.series || "",
      })
    }
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await onSubmit({
        ...formData,
        seasonId: formData.seasonId ? Number(formData.seasonId) : null,
        rarityId: formData.rarityId ? Number(formData.rarityId) : null,
      })
    } catch (err: any) {
      setError(err.message || "Failed to save product")
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }))
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{product ? "Edit Product" : "Create Product"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="season">Season</Label>
              <Select
                value={formData.seasonId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, seasonId: value }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select season" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No season</SelectItem>
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id.toString()}>
                      {season.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rarity">Rarity</Label>
              <Select
                value={formData.rarityId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, rarityId: value }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rarity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No rarity</SelectItem>
                  {rarities.map((rarity) => (
                    <SelectItem key={rarity.id} value={rarity.id.toString()}>
                      {rarity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="series">Series</Label>
              <Input
                id="series"
                value={formData.series}
                onChange={(e) => setFormData((prev) => ({ ...prev, series: e.target.value }))}
                disabled={loading}
              />
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="redeemable"
                checked={formData.redeemable}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, redeemable: checked as boolean }))}
                disabled={loading}
              />
              <Label htmlFor="redeemable">Redeemable</Label>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : product ? "Update" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

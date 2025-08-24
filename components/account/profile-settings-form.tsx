"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Mail, AtSign, User } from "lucide-react"

interface ProfileSettingsFormProps {
  userId: string
}

export function ProfileSettingsForm({ userId }: ProfileSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    name: "",
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/user/profile")
        if (response.ok) {
          const profile = await response.json()
          setFormData({
            email: profile.email || "",
            username: profile.username || "",
            name: profile.name || "",
          })
        }
      } catch (error) {
        console.error("Failed to load profile:", error)
        toast.error("Failed to load profile data")
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Profile updated successfully!")
      } else {
        toast.error(data.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Profile update error:", error)
      toast.error("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (isLoadingProfile) {
    return <div className="text-center py-4">Loading profile...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Display Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Enter your display name"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            id="username"
            type="text"
            value={formData.username}
            onChange={(e) => handleChange("username", e.target.value)}
            placeholder="Enter your username"
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="Enter your email"
            className="pl-10"
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        <Mail className="w-4 h-4 mr-2" />
        {isLoading ? "Updating..." : "Update Profile"}
      </Button>
    </form>
  )
}

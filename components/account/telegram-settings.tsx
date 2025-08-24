"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface TelegramSettingsProps {
  user: {
    id: string
    username: string
    telegramUserId?: string | null
    telegramUsername?: string | null
  }
}

export function TelegramSettings({ user }: TelegramSettingsProps) {
  const [telegramUserId, setTelegramUserId] = useState(user.telegramUserId || "")
  const [telegramUsername, setTelegramUsername] = useState(user.telegramUsername || "")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUserId: telegramUserId || null,
          telegramUsername: telegramUsername || null,
        }),
      })

      if (response.ok) {
        toast({
          title: "Settings updated",
          description: "Your Telegram settings have been saved.",
        })
      } else {
        throw new Error("Failed to update settings")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update Telegram settings.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telegram Integration</CardTitle>
        <CardDescription>Connect your Telegram account to receive order notifications and use the bot</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="telegram-user-id">Telegram User ID</Label>
          <Input
            id="telegram-user-id"
            placeholder="Get from @userinfobot"
            value={telegramUserId}
            onChange={(e) => setTelegramUserId(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telegram-username">Telegram Username</Label>
          <Input
            id="telegram-username"
            placeholder="@yourusername"
            value={telegramUsername}
            onChange={(e) => setTelegramUsername(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  )
}

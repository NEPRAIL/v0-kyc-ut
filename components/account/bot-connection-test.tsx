"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

interface BotStatus {
  connected: boolean
  bot?: {
    username: string
    firstName: string
    id: number
  }
  config?: {
    adminId: string
    webhookSecret: string
  }
  error?: string
  details?: string
}

export function BotConnectionTest() {
  const [status, setStatus] = useState<BotStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testConnection = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/bot/test")
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      setStatus({
        connected: false,
        error: "Connection failed",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bot Connection Status</CardTitle>
        <CardDescription>Test the connection between your website and the Telegram bot</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testConnection} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing Connection...
            </>
          ) : (
            "Test Bot Connection"
          )}
        </Button>

        {status && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {status.connected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <Badge variant={status.connected ? "default" : "destructive"}>
                {status.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>

            {status.bot && (
              <div className="text-sm space-y-1">
                <p>
                  <strong>Bot:</strong> @{status.bot.username}
                </p>
                <p>
                  <strong>Name:</strong> {status.bot.firstName}
                </p>
                <p>
                  <strong>ID:</strong> {status.bot.id}
                </p>
              </div>
            )}

            {status.config && (
              <div className="text-sm space-y-1">
                <p>
                  <strong>Admin ID:</strong> {status.config.adminId}
                </p>
                <p>
                  <strong>Webhook Secret:</strong> {status.config.webhookSecret}
                </p>
              </div>
            )}

            {status.error && (
              <div className="text-sm text-red-600">
                <p>
                  <strong>Error:</strong> {status.error}
                </p>
                {status.details && (
                  <p>
                    <strong>Details:</strong> {status.details}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, ExternalLink } from "lucide-react"

export default function LinkTelegramPage() {
  const [linked, setLinked] = useState(false)
  const [error, setError] = useState("")
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "KYCutBot"

  useEffect(() => {
    // Check if user came back from successful Telegram auth
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get("success") === "true") {
      setLinked(true)
    }
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                T
              </div>
              Link your Telegram
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {linked ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your Telegram account has been successfully linked! You can now receive order notifications and
                  complete payments via our bot.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  After linking, you can receive orders and pay in Telegram. This provides a secure and convenient way
                  to manage your purchases.
                </p>

                <div className="flex justify-center">
                  <script
                    async
                    src="https://telegram.org/js/telegram-widget.js?22"
                    data-telegram-login={botUsername}
                    data-size="large"
                    data-userpic="false"
                    data-auth-url="/api/telegram/link"
                    data-request-access="write"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`https://t.me/${botUsername}`, "_blank")}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Telegram Bot
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

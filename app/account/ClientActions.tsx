"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Copy, RefreshCw, MessageCircle, ExternalLink, Clock, Unlink } from "lucide-react"

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  return (
    <Button
      onClick={async () => {
        if (loading) return
        setLoading(true)
        await fetch("/api/auth/logout", { method: "POST" })
        router.refresh()
        router.push("/login")
      }}
      variant="destructive"
      disabled={loading}
    >
      {loading ? "Logging out..." : "Log out"}
    </Button>
  )
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Button onClick={handleCopy} variant="outline" size="sm" className="bg-transparent">
      <Copy className="h-3 w-3 mr-1" />
      {copied ? "Copied!" : label}
    </Button>
  )
}

export function OpenTelegramButton({ deepLink }: { deepLink: string }) {
  return (
    <Button asChild className="w-full">
      <a href={deepLink} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4 mr-2" />
        Open Telegram Bot
        <ExternalLink className="h-3 w-3 ml-2" />
      </a>
    </Button>
  )
}

export function GenerateLinkingCodeButton() {
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateCode = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/telegram/generate-code", {
        method: "POST",
        credentials: "include",
      })

      const data = await response.json()

      if (data.success) {
        setCode(data.code)
        setExpiresAt(data.expiresAt)
      } else {
        setError(data.error || "Failed to generate code")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()

    if (diff <= 0) return "Expired"

    const minutes = Math.floor(diff / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  if (code) {
    return (
      <Card className="bg-primary/10 border-primary/20">
        <CardContent className="p-4 space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-primary mb-2">Your Linking Code</h3>
            <div className="text-3xl font-mono font-bold tracking-wider bg-background px-4 py-2 rounded-lg border">
              {code}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Expires in: {expiresAt && formatTimeRemaining(expiresAt)}</span>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              Open Telegram and send this command to @KYCutBot:
            </p>
            <div className="bg-background p-3 rounded-lg border font-mono text-sm text-center">/link {code}</div>
            <div className="flex gap-2">
              <CopyButton text={`/link ${code}`} label="Copy Command" />
              <Button
                onClick={generateCode}
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent"
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                New Code
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Code expires in 10 minutes</p>
            <p>• One-time use only</p>
            <p>• Links this Telegram account to your KYCut account</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Button onClick={generateCode} disabled={loading} className="w-full">
        {loading ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Generating Code...
          </>
        ) : (
          <>
            <MessageCircle className="h-4 w-4 mr-2" />
            Generate Linking Code
          </>
        )}
      </Button>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Get a secure 8-digit code to link your accounts</p>
        <p>• Use the code in Telegram with /link command</p>
        <p>• Code expires in 10 minutes for security</p>
      </div>
    </div>
  )
}

export function UnlinkTelegramButton() {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  const handleUnlink = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/telegram/unlink", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        router.refresh()
      } else {
        console.error("Failed to unlink Telegram account")
      }
    } catch (error) {
      console.error("Error unlinking Telegram:", error)
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <Card className="bg-destructive/10 border-destructive/20">
        <CardContent className="p-4 space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-destructive mb-2">Confirm Unlink</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to unlink your Telegram account? You'll stop receiving order notifications and won't
              be able to use bot commands.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowConfirm(false)} variant="outline" size="sm" className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleUnlink} variant="destructive" size="sm" className="flex-1" disabled={loading}>
              {loading ? "Unlinking..." : "Unlink"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Button
      onClick={() => setShowConfirm(true)}
      variant="outline"
      size="sm"
      className="w-full bg-transparent text-destructive border-destructive/20 hover:bg-destructive/10"
    >
      <Unlink className="h-4 w-4 mr-2" />
      Unlink Account
    </Button>
  )
}

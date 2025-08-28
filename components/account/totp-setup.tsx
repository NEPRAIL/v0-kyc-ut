"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { QrCode, Shield, ShieldCheck } from "lucide-react"
import Image from "next/image"

interface TOTPSetupProps {
  isEnabled: boolean
  onStatusChange: () => void
}

export function TOTPSetup({ isEnabled, onStatusChange }: TOTPSetupProps) {
  const [setupData, setSetupData] = useState<{
    secret: string
    uri: string
    qrCodeUrl: string
    manualEntryKey: string
  } | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showSetup, setShowSetup] = useState(false)

  const handleSetupTOTP = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/totp/setup", { method: "POST" })
      const data = await response.json()

      if (response.ok) {
        setSetupData(data)
        setShowSetup(true)
      } else {
        setError(data.error || "Failed to setup TOTP")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyTOTP = async () => {
    if (!verificationCode) {
      setError("Please enter the verification code")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationCode }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess("Two-factor authentication enabled successfully!")
        setShowSetup(false)
        setSetupData(null)
        setVerificationCode("")
        onStatusChange()
      } else {
        setError(data.error || "Invalid verification code")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDisableTOTP = async () => {
    if (!confirm("Are you sure you want to disable two-factor authentication?")) {
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disable: true }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess("Two-factor authentication disabled")
        onStatusChange()
      } else {
        setError(data.error || "Failed to disable TOTP")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isEnabled ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            Two-Factor Authentication
          </CardTitle>
          <Badge variant={isEnabled ? "default" : "secondary"}>{isEnabled ? "Enabled" : "Disabled"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add an extra layer of security to your account with time-based one-time passwords (TOTP).
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {!isEnabled && !showSetup && (
          <Button onClick={handleSetupTOTP} disabled={loading}>
            <QrCode className="h-4 w-4 mr-2" />
            {loading ? "Setting up..." : "Enable Two-Factor Authentication"}
          </Button>
        )}

        {showSetup && setupData && (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Step 1: Scan QR Code</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              <div className="flex justify-center mb-4">
                <Image
                  src={
                    setupData.qrCodeUrl ||
                    "https://dummyimage.com/200x200/1f2937/ffffff.png&text=QR"
                  }
                  alt="TOTP QR Code"
                  width={200}
                  height={200}
                  className="border rounded-lg"
                />
              </div>
              <div>
                <Label htmlFor="manualKey">Or enter this key manually:</Label>
                <Input id="manualKey" value={setupData.manualEntryKey} readOnly className="font-mono text-sm mt-1" />
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Step 2: Verify Setup</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enter the 6-digit code from your authenticator app to complete setup.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="font-mono"
                />
                <Button onClick={handleVerifyTOTP} disabled={loading || verificationCode.length !== 6}>
                  {loading ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </div>

            <Button variant="outline" onClick={() => setShowSetup(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        )}

        {isEnabled && (
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div>
              <div className="font-medium text-green-800 dark:text-green-200">Two-factor authentication is enabled</div>
              <div className="text-sm text-green-600 dark:text-green-300">Your account is protected with TOTP</div>
            </div>
            <Button variant="outline" onClick={handleDisableTOTP} disabled={loading}>
              {loading ? "Disabling..." : "Disable"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

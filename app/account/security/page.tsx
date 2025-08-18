"use client"

import { useState, useEffect } from "react"
import { AccountHeader } from "@/components/account/account-header"
import { ChangePasswordForm } from "@/components/account/change-password-form"
import { TOTPSetup } from "@/components/account/totp-setup"

export default function SecurityPage() {
  const [user, setUser] = useState<{ totpSecret: string | null } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserData = async () => {
    try {
      // This would typically come from a user info API endpoint
      // For now, we'll simulate it
      setUser({ totpSecret: null }) // This should come from actual user data
    } catch (error) {
      console.error("Failed to fetch user data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  const handleTOTPStatusChange = () => {
    fetchUserData() // Refresh user data when TOTP status changes
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <AccountHeader title="Security" description="Manage your account security settings" />
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded-lg"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AccountHeader title="Security" description="Manage your account security settings" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChangePasswordForm />
        <TOTPSetup isEnabled={!!user?.totpSecret} onStatusChange={handleTOTPStatusChange} />
      </div>
    </div>
  )
}

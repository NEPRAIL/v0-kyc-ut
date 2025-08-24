import { requireAuth } from "@/lib/auth-server"
import { AccountHeader } from "@/components/account/account-header"
import { ProfileSettingsForm } from "@/components/account/profile-settings-form"
import { SecuritySettingsForm } from "@/components/account/security-settings-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const auth = await requireAuth()
  if (!auth.success) {
    // This should redirect, but just in case
    return <div>Authentication required</div>
  }

  return (
    <div className="space-y-6">
      <AccountHeader title="Account Settings" description="Manage your profile, security, and preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileSettingsForm userId={auth.userId} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <SecuritySettingsForm userId={auth.userId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

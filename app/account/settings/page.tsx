import { requireAuth } from "@/lib/auth/middleware"
import { AccountHeader } from "@/components/account/account-header"
import { ProfileSettingsForm } from "@/components/account/profile-settings-form"
import { SecuritySettingsForm } from "@/components/account/security-settings-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function SettingsPage() {
  const { user } = await requireAuth()

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
              <ProfileSettingsForm user={user} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <SecuritySettingsForm user={user} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

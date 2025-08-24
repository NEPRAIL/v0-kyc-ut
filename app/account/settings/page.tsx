import { requireAuth } from "@/lib/auth/middleware"
import { AccountHeader } from "@/components/account/account-header"
import { ChangePasswordForm } from "@/components/account/change-password-form"
import { TelegramSettings } from "@/components/account/telegram-settings"
import { BotConnectionTest } from "@/components/account/bot-connection-test"

export default async function SettingsPage() {
  const { user } = await requireAuth()

  return (
    <div className="space-y-6">
      <AccountHeader title="Account Settings" description="Manage your security settings and bot connection" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ChangePasswordForm />
          <TelegramSettings user={user} />
        </div>
        <div className="space-y-6">
          <BotConnectionTest />
        </div>
      </div>
    </div>
  )
}

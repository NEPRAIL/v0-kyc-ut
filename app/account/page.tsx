import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth/middleware"
import { AccountHeader } from "@/components/account/account-header"
import { ProfileForm } from "@/components/account/profile-form"
import { OrderHistory } from "@/components/account/order-history"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  try {
    const { user } = await requireAuth()

    return (
      <div className="space-y-6">
        <AccountHeader title="Account Dashboard" description="Manage your account and view your orders" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfileForm user={user} />
          <div className="space-y-6">
            <OrderHistory />
          </div>
        </div>
      </div>
    )
  } catch (error) {
    redirect("/login")
  }
}

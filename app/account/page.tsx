import { requireAuth } from "@/lib/auth/middleware"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AccountHeader } from "@/components/account/account-header"

export default async function AccountPage() {
  const { user } = await requireAuth()

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <AccountHeader title="Profile" description="Manage your account information" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Username</label>
              <div className="text-lg">{user.username}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <div>
                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                  {user.role === "admin" ? "Administrator" : "User"}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Member Since</label>
              <div>{formatDate(new Date())}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Two-Factor Authentication</div>
                <div className="text-sm text-muted-foreground">{user.totpSecret ? "Enabled" : "Not configured"}</div>
              </div>
              <Badge variant={user.totpSecret ? "default" : "secondary"}>
                {user.totpSecret ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Password</div>
                <div className="text-sm text-muted-foreground">Last changed recently</div>
              </div>
              <Badge variant="secondary">Protected</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/account/security" className="p-4 border rounded-lg hover:bg-muted transition-colors text-center">
              <div className="font-medium">Security Settings</div>
              <div className="text-sm text-muted-foreground">Change password, setup 2FA</div>
            </a>
            <a href="/orders" className="p-4 border rounded-lg hover:bg-muted transition-colors text-center">
              <div className="font-medium">Order History</div>
              <div className="text-sm text-muted-foreground">View your past orders</div>
            </a>
            <a href="/shop" className="p-4 border rounded-lg hover:bg-muted transition-colors text-center">
              <div className="font-medium">Continue Shopping</div>
              <div className="text-sm text-muted-foreground">Browse the marketplace</div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

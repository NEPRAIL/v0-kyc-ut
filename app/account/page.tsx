export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { unstable_noStore as noStore } from "next/cache"
import { requireAuth } from "@/lib/auth-server"
import { loadUserSafe, loadTelegramLinkSafe, loadRecentOrdersSafe } from "@/lib/user"
import {
  LogoutButton,
  CopyButton,
  OpenTelegramButton,
  GenerateLinkingCodeButton,
  UnlinkTelegramButton,
} from "./ClientActions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { User, Shield, MessageCircle, Package, Settings, ExternalLink } from "lucide-react"
import Link from "next/link"

function currency(cents: number, code: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`
  }
}

export default async function AccountPage() {
  noStore()

  const auth = await requireAuth()
  if (!auth.ok) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">Please sign in to access your account dashboard.</p>
            <Button asChild className="w-full">
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const [me, tg, recent] = await Promise.all([
    loadUserSafe(auth.userId),
    loadTelegramLinkSafe(auth.userId),
    loadRecentOrdersSafe(auth.userId, 10),
  ])

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || ""
  const tgDeepLink = botUsername ? `https://t.me/${botUsername}?start=hello_${auth.userId}` : ""

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Account Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your profile, orders, and integrations</p>
          </div>
          <LogoutButton />
        </div>

        {/* Profile Overview Card */}
        <Card className="card-professional">
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <User className="h-10 w-10 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-foreground">{me?.username ?? "User"}</h2>
                  {!me && (
                    <Badge variant="outline" className="text-xs">
                      Profile Loading
                    </Badge>
                  )}
                </div>
                <p className="text-lg text-muted-foreground mb-4">{me?.email ?? "Email not available"}</p>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg">
                    <span className="text-sm font-medium">Session ID:</span>
                    <code className="text-xs bg-background px-2 py-1 rounded font-mono">
                      {auth.session?.uid?.slice(0, 8)}...
                    </code>
                    <CopyButton text={String(auth.session?.uid ?? "")} label="Copy" />
                  </div>
                  {me?.id && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg">
                      <span className="text-sm font-medium">User ID:</span>
                      <code className="text-xs bg-background px-2 py-1 rounded font-mono">{me.id.slice(0, 8)}...</code>
                      <CopyButton text={me.id} label="Copy" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Dashboard Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Security Card */}
          <Card className="card-professional">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Secure Session Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">HTTPS Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Cookie Protection</span>
                </div>
              </div>

              <Separator />

              <div className="text-sm text-muted-foreground space-y-2">
                <p>• HttpOnly cookies with SameSite protection</p>
                <p>• HMAC session validation with expiration</p>
                <p>• Secure token rotation available</p>
              </div>

              <Button variant="outline" size="sm" className="w-full mt-4 bg-transparent">
                <Settings className="h-4 w-4 mr-2" />
                Security Settings
              </Button>
            </CardContent>
          </Card>

          {/* Telegram Integration Card */}
          <Card className="card-professional">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-accent" />
                Telegram Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tg ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-green-400">Connected</p>
                      <p className="text-sm text-muted-foreground">@{tg.telegramUsername ?? tg.telegramUserId}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>✓ Order notifications enabled</p>
                    <p>✓ Bot commands available</p>
                    <p>✓ Real-time updates</p>
                  </div>

                  {tgDeepLink && <OpenTelegramButton deepLink={tgDeepLink} />}

                  <UnlinkTelegramButton />

                  <p className="text-xs text-muted-foreground">Contact support for further assistance.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-yellow-400">Not Connected</p>
                      <p className="text-sm text-muted-foreground">Link your Telegram account</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Get order notifications</p>
                    <p>• Manage orders via bot</p>
                    <p>• Real-time support</p>
                  </div>

                  <GenerateLinkingCodeButton />

                  {tgDeepLink && (
                    <p className="text-xs text-muted-foreground text-center">
                      Or{" "}
                      <a className="underline hover:text-accent" href={tgDeepLink} target="_blank" rel="noreferrer">
                        open the bot directly
                      </a>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Orders Card */}
          <Card className="card-professional">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-secondary" />
                  Recent Orders
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/orders">
                    View All
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No orders yet</p>
                  <Button asChild>
                    <Link href="/">Start Shopping</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recent.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-muted/10 rounded-lg hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.createdAt ? new Date(order.createdAt as any).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{currency(order.totalCents, order.currency)}</p>
                        <Badge variant={order.status === "completed" ? "default" : "secondary"} className="text-xs">
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  <div className="text-center pt-4">
                    <p className="text-xs text-muted-foreground">
                      Showing {Math.min(recent.length, 5)} of {recent.length} orders
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Account Management Section */}
        <Card className="card-professional">
          <CardHeader>
            <CardTitle className="text-xl">Account Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Shield className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Package className="h-4 w-4 mr-2" />
                    Order History
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Support & Help</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Help Center
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h3 className="font-semibold text-destructive mb-2">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Account deletion is permanent and cannot be undone. Contact support for assistance.
              </p>
              <Button variant="destructive" size="sm">
                Request Account Deletion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

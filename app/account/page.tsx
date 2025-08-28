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
import { User, Shield, MessageCircle, Package, Settings, ExternalLink, Smartphone, Monitor } from "lucide-react"
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
      <main className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md shadow-lg border-0 bg-card/95 backdrop-blur">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">Please sign in to access your account dashboard.</p>
            <Button asChild className="w-full h-11 font-medium">
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
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/50">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Account Dashboard
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">Manage your profile, orders, and integrations</p>
          </div>
          <div className="flex sm:justify-end">
            <LogoutButton />
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-gradient-to-r from-card/95 to-card/90 backdrop-blur">
          <CardContent className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-8">
              <div className="relative mx-auto sm:mx-0">
                <div className="h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 rounded-2xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center shadow-lg">
                  <User className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 text-primary-foreground" />
                </div>
                <div className="absolute -bottom-2 -right-2 h-6 w-6 bg-green-500 rounded-full border-2 border-background shadow-sm"></div>
              </div>
              <div className="flex-1 text-center sm:text-left space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                      {me?.username ?? "User"}
                    </h2>
                    {!me && (
                      <Badge variant="outline" className="text-xs mx-auto sm:mx-0 w-fit animate-pulse">
                        Profile Loading
                      </Badge>
                    )}
                  </div>
                  <p className="text-lg sm:text-xl text-muted-foreground">{me?.email ?? "Email not available"}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-xl border border-border/50">
                    <div className="flex-shrink-0">
                      <span className="text-sm font-medium text-muted-foreground">Session ID:</span>
                    </div>
                    <code className="text-xs bg-background/80 px-3 py-1.5 rounded-lg font-mono border flex-1 min-w-0 truncate">
                      {auth.session?.uid?.slice(0, 12)}...
                    </code>
                    <CopyButton text={String(auth.session?.uid ?? "")} label="Copy" />
                  </div>
                  {me?.id && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-xl border border-border/50">
                      <div className="flex-shrink-0">
                        <span className="text-sm font-medium text-muted-foreground">User ID:</span>
                      </div>
                      <code className="text-xs bg-background/80 px-3 py-1.5 rounded-lg font-mono border flex-1 min-w-0 truncate">
                        {me.id.slice(0, 12)}...
                      </code>
                      <CopyButton text={me.id} label="Copy" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Security Card */}
          <Card className="shadow-lg border-0 bg-card/95 backdrop-blur hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Secure Session Active</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">HTTPS Encryption</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <div className="h-3 w-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium">Cookie Protection</span>
                </div>
              </div>

              <Separator />

              <div className="text-sm text-muted-foreground space-y-2 bg-muted/20 p-4 rounded-lg">
                <p>• HttpOnly cookies with SameSite protection</p>
                <p>• HMAC session validation with expiration</p>
                <p>• Secure token rotation available</p>
              </div>

              <Button variant="outline" size="sm" className="w-full h-11 bg-transparent hover:bg-muted/50">
                <Settings className="h-4 w-4 mr-2" />
                Security Settings
              </Button>
            </CardContent>
          </Card>

          {/* Telegram Integration Card */}
          <Card className="shadow-lg border-0 bg-card/95 backdrop-blur hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <MessageCircle className="h-5 w-5 text-accent" />
                </div>
                Telegram Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
          <Card className="shadow-lg border-0 bg-card/95 backdrop-blur hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <Package className="h-5 w-5 text-secondary" />
                  </div>
                  Recent Orders
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/orders">
                    <span className="hidden sm:inline">View All</span>
                    <ExternalLink className="h-3 w-3 sm:ml-2" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="p-2 bg-muted/10 rounded-lg">
                    <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                  </div>
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

        <Card className="shadow-lg border-0 bg-card/95 backdrop-blur">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Settings className="h-5 w-5 text-accent" />
              </div>
              Account Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12 bg-transparent hover:bg-muted/50 border-border/50"
                  >
                    <User className="h-4 w-4 mr-3" />
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12 bg-transparent hover:bg-muted/50 border-border/50"
                  >
                    <Shield className="h-4 w-4 mr-3" />
                    Change Password
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12 bg-transparent hover:bg-muted/50 border-border/50"
                    asChild
                  >
                    <Link href="/orders">
                      <Package className="h-4 w-4 mr-3" />
                      Order History
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 bg-accent rounded-full"></div>
                  Support & Help
                </h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12 bg-transparent hover:bg-muted/50 border-border/50"
                  >
                    <MessageCircle className="h-4 w-4 mr-3" />
                    Contact Support
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-12 bg-transparent hover:bg-muted/50 border-border/50"
                  >
                    <ExternalLink className="h-4 w-4 mr-3" />
                    Help Center
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-center gap-8 py-6 bg-muted/20 rounded-xl">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Smartphone className="h-4 w-4 text-green-500" />
                </div>
                <span className="font-medium">Mobile Optimized</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Monitor className="h-4 w-4 text-blue-500" />
                </div>
                <span className="font-medium">Desktop Enhanced</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-destructive/10 to-red-500/10 border border-destructive/20 rounded-xl p-6">
              <h3 className="font-semibold text-destructive mb-3 flex items-center gap-2">
                <div className="h-2 w-2 bg-destructive rounded-full animate-pulse"></div>
                Danger Zone
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Account deletion is permanent and cannot be undone. Contact support for assistance.
              </p>
              <Button variant="destructive" size="sm" className="h-10">
                Request Account Deletion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

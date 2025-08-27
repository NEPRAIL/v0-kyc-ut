// middleware.ts — EDGE-SAFE security headers only
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt)).*)",
  ],
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // Lightweight API request logging (dev-friendly). Avoid printing secrets.
  try {
    if (pathname.startsWith("/api")) {
      const method = req.method
      const hasAuth = !!req.headers.get("authorization")
      const hasWebhook = !!req.headers.get("x-webhook-secret")
      // Timestamped one-line summary
      console.log(
        `[API] ${new Date().toISOString()} ${method} ${pathname} auth=${hasAuth} webhook=${hasWebhook}`,
      )
    }
  } catch {
    // noop
  }

  const res = NextResponse.next()

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://telegram.org https://core.telegram.org https://oauth.telegram.org",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self' https://telegram.org https://core.telegram.org https://oauth.telegram.org",
    "frame-ancestors 'none'",
  ].join("; ")

  res.headers.set("Content-Security-Policy", csp)
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("Referrer-Policy", "no-referrer")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  res.headers.set("X-Bot-API-Version", "1.0")
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Webhook-Secret")
  res.headers.set("Access-Control-Max-Age", "86400")

  return res
}

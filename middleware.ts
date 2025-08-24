import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth/session"
import { rateLimiter } from "@/lib/security/rate-limiter"
import { securityMonitor } from "@/lib/security/security-monitor"

// Protected routes that require authentication
const protectedRoutes = ["/account", "/admin", "/orders"]
const authRoutes = ["/login", "/register"]

// Rate limiting configuration
const rateLimitConfig = {
  "/api/auth/login": { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  "/api/auth/register": { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  "/api/auth/forgot-password": { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  "/api/auth/reset-password": { maxAttempts: 5, windowMs: 60 * 60 * 1000 }, // 5 attempts per hour
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = request.cookies.get("session")?.value
  const ipAddress = request.ip || request.headers.get("x-forwarded-for") || "unknown"
  const userAgent = request.headers.get("user-agent") || "unknown"

  if (pathname.startsWith("/api/")) {
    const config = rateLimitConfig[pathname as keyof typeof rateLimitConfig]
    if (config) {
      const identifier = ipAddress
      const { allowed, remaining, resetTime } = await rateLimiter.checkLimit(
        identifier,
        pathname,
        config.maxAttempts,
        config.windowMs,
      )

      if (!allowed) {
        // Log rate limit violation
        await securityMonitor.logSecurityEvent({
          type: "suspicious_activity",
          ipAddress,
          userAgent,
          details: { reason: "rate_limit_exceeded", endpoint: pathname },
          timestamp: new Date(),
        })

        return NextResponse.json(
          {
            error: "Too many requests. Please try again later.",
            resetTime: Math.ceil((resetTime - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": config.maxAttempts.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": Math.ceil(resetTime / 1000).toString(),
            },
          },
        )
      }

      // Add rate limit headers to successful responses
      const response = NextResponse.next()
      response.headers.set("X-RateLimit-Limit", config.maxAttempts.toString())
      response.headers.set("X-RateLimit-Remaining", remaining.toString())
      response.headers.set("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString())
    }
  }

  const isSuspicious = await securityMonitor.detectSuspiciousActivity(ipAddress, userAgent)
  if (isSuspicious && pathname.startsWith("/api/auth/")) {
    return NextResponse.json({ error: "Suspicious activity detected. Please try again later." }, { status: 429 })
  }

  // Get user from session
  const user = sessionToken ? await getSessionUser(sessionToken) : null

  // Redirect authenticated users away from auth pages
  if (user && authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/account", request.url))
  }

  // Redirect unauthenticated users from protected routes
  if (!user && protectedRoutes.some((route) => pathname.startsWith(route))) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Add user info and security headers to response
  const response = NextResponse.next()
  if (user) {
    response.headers.set("x-user-id", user.id)
    response.headers.set("x-user-email", user.email)
  }

  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
  )

  return response
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
}

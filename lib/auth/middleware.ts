// middleware.ts — SAFE version
import { NextResponse, type NextRequest } from "next/server"
import { verifySession } from "../security"

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map)).*)"],
}

export function middleware(_req: NextRequest) {
  const res = NextResponse.next()

  // Keep CSP simple; optionally allow vercel.live or remove it later
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join("; ")

  res.headers.set("Content-Security-Policy", csp)
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("Referrer-Policy", "no-referrer")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  return res
}

export async function requireAuth(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const session = await verifySession(sessionCookie)
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    return { user: session }
  } catch (error) {
    console.error("[v0] Auth middleware error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
  }
}

export async function requireAdmin(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)

    if (authResult instanceof NextResponse) {
      return authResult // Return the error response
    }

    const { user } = authResult
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    return { user }
  } catch (error) {
    console.error("[v0] Admin middleware error:", error)
    return NextResponse.json({ error: "Authorization failed" }, { status: 403 })
  }
}

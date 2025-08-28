// middleware.ts — SAFE version
import { NextResponse, type NextRequest } from "next/server"
import { verifySession } from "../security"
import { db } from "../db"
import { users } from "../db/schema"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"

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

export async function getServerAuth() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")?.value

    if (!sessionCookie) {
      return null
    }

  const session = await verifySession(sessionCookie)
  return session ? { user: { id: session.uid } } : null
  } catch (error) {
    console.error("[v0] Server auth error:", error)
    return null
  }
}

export async function requireAuth() {
  const auth = await getServerAuth()

  if (!auth) {
    throw new Error("Authentication required")
  }

  return auth
}

export async function requireAdmin() {
  const auth = await requireAuth()
  // Prefer env-based allowlist for simplicity; fallback to DB role if present
  const adminUserId = process.env.ADMIN_USER_ID
  if (adminUserId && auth.user.id === adminUserId) return auth

  // Optional DB role check if users table has a role column; ignore if not found
  try {
    const [u] = await db.select().from(users).where(eq(users.id, auth.user.id)).limit(1)
    if (u && (u as any).role === "admin") return auth
  } catch {}

  throw new Error("Admin access required")
}

export async function requireAuthAPI(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

  const session = await verifySession(sessionCookie)
  if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

  return { user: { id: session.uid } }
  } catch (error) {
    console.error("[v0] Auth middleware error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
  }
}

export async function requireAdminAPI(request: NextRequest) {
  try {
    const authResult = await requireAuthAPI(request)

    if (authResult instanceof NextResponse) {
      return authResult // Return the error response
    }

    const { user } = authResult
    const adminUserId = process.env.ADMIN_USER_ID
    if (adminUserId && user.id === adminUserId) return { user }

    try {
      const [u] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
      if (u && (u as any).role === "admin") return { user }
    } catch {}

    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  } catch (error) {
    console.error("[v0] Admin middleware error:", error)
    return NextResponse.json({ error: "Authorization failed" }, { status: 403 })
  }
}

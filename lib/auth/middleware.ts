import { NextResponse } from "next/server"
import { verifySession } from "@/lib/security"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export type RequireAuthResult = { ok: true; userId: string; session: { userId: string } } | { ok: false; status: 401 }

export async function requireAuth(): Promise<RequireAuthResult | NextResponse> {
  const session = await verifySession() // must be tolerant (null on invalid)
  if (!session?.userId) {
    try {
      return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"))
    } catch {
      return { ok: false, status: 401 }
    }
  }
  // userId is a uuid string in your schema
  const userId = String(session.userId)
  return { ok: true, userId, session: { userId } }
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return !!u && (u as any).role === "admin"
}

export async function requireAdmin(): Promise<true | NextResponse> {
  const res = await requireAuth()
  if (res instanceof NextResponse) return res
  if (!res.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = await isUserAdmin(res.userId)
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return true
}

export async function getServerAuth() {
  try {
    const session = await verifySession()
    return session ? { user: session } : null
  } catch (error) {
    console.error("[v0] Server auth error:", error)
    return null
  }
}

export async function requireAdminAPI(request: any) {
  const res = await requireAuth()
  if (res instanceof NextResponse) return res
  if (!res.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const admin = await isUserAdmin(res.userId)
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return { user: { userId: res.userId } }
}

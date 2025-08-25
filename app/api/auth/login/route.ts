import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

function signCookie(uid: string) {
  const secret = process.env.SESSION_SECRET || ""
  if (!secret) return null
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600
  const payload = Buffer.from(JSON.stringify({ uid, exp })).toString("base64url")
  const key = (() => {
    try {
      const b = Buffer.from(secret, "base64")
      return b.length >= 32 ? b : Buffer.from(secret, "utf8")
    } catch {
      return Buffer.from(secret, "utf8")
    }
  })()
  const mac = crypto.createHmac("sha256", key).update(payload).digest("base64url")
  return `${payload}.${mac}`
}

export async function POST(req: Request) {
  try {
    console.log("[v0] Login API called")
    const body = await req.json().catch(() => null)
    console.log("[v0] Login request body:", body)

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      console.log("[v0] Login validation failed:", parsed.error.issues)
      return NextResponse.json(
        { error: "Invalid input", code: "VALIDATION_ERROR", issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const { emailOrUsername, password } = parsed.data
    console.log("[v0] Login attempt for:", emailOrUsername)

    const db = getDb()

    // Normalize email lookups (case-insensitive)
    const byEmail = emailOrUsername.includes("@")
    const lookupVal = byEmail ? emailOrUsername.toLowerCase() : emailOrUsername
    console.log("[v0] Looking up by:", byEmail ? "email" : "username", "value:", lookupVal)

    // If your emails are stored lowercased at signup:
    const rows = await db
      .select()
      .from(users)
      .where(byEmail ? eq(users.email, lookupVal) : eq(users.username, lookupVal))
      .limit(1)

    console.log("[v0] Database query returned:", rows.length, "rows")
    const user = rows[0]
    if (!user) {
      console.log("[v0] User not found for:", lookupVal)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("[v0] User found:", {
      id: (user as any).id,
      email: (user as any).email,
      username: (user as any).username,
    })
    console.log("[v0] Comparing password with hash")

    const ok = await bcrypt.compare(password, (user as any).password_hash)
    console.log("[v0] Password comparison result:", ok)

    if (!ok) {
      console.log("[v0] Password mismatch for user:", (user as any).email)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("[v0] Authentication successful, creating session")
    const cookieVal = signCookie((user as any).id)
    if (!cookieVal) {
      console.log("[v0] Failed to sign cookie - missing SESSION_SECRET")
      return NextResponse.json({ error: "Server misconfigured: missing SESSION_SECRET" }, { status: 500 })
    }

    console.log("[v0] Login successful for user:", (user as any).email)
    const res = NextResponse.json({ success: true })
    res.cookies.set("session", cookieVal, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })
    return res
  } catch (e) {
    console.error("[v0] Login error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

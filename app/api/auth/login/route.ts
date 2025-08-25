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
    const body = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", code: "VALIDATION_ERROR", issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const { emailOrUsername, password } = parsed.data
    const db = getDb()

    // Normalize email lookups (case-insensitive)
    const byEmail = emailOrUsername.includes("@")
    const lookupVal = byEmail ? emailOrUsername.toLowerCase() : emailOrUsername

    // If your emails are stored lowercased at signup:
    const rows = await db
      .select()
      .from(users)
      .where(byEmail ? eq(users.email, lookupVal) : eq(users.username, lookupVal))
      .limit(1)

    const user = rows[0]
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

    const ok = await bcrypt.compare(password, (user as any).password_hash)
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

    const cookieVal = signCookie((user as any).id)
    if (!cookieVal) {
      return NextResponse.json({ error: "Server misconfigured: missing SESSION_SECRET" }, { status: 500 })
    }

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
    console.error("[login] error", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

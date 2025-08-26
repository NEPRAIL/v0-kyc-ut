import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { createHmac } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

function signCookie(uid: string) {
  const secret = process.env.SESSION_SECRET || ""
  if (!secret || secret.length < 32) return null

  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600
  const payload = Buffer.from(JSON.stringify({ uid, exp })).toString("base64url")

  // accept base64 or utf8 secret
  let key: Buffer
  try {
    const b = Buffer.from(secret, "base64")
    key = b.length >= 32 ? b : Buffer.from(secret, "utf8")
  } catch {
    key = Buffer.from(secret, "utf8")
  }
  const mac = createHmac("sha256", key).update(payload).digest("base64url")
  return `${payload}.${mac}`
}

export async function POST(req: Request) {
  try {
    console.log("[v0] Login attempt started")
    const body = await req.json().catch(() => null)
    console.log("[v0] Request body:", JSON.stringify(body))

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      console.log("[v0] Validation failed:", parsed.error.issues)
      return NextResponse.json(
        { error: "Invalid input", code: "VALIDATION_ERROR", issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const { emailOrUsername, password } = parsed.data
    console.log("[v0] Login data - emailOrUsername:", emailOrUsername, "password length:", password.length)

    const db = getDb()

    // normalize email lookups if emails are stored lowercased
    const byEmail = emailOrUsername.includes("@")
    const lookupVal = byEmail ? emailOrUsername.toLowerCase() : emailOrUsername
    console.log("[v0] Looking up user by", byEmail ? "email" : "username", ":", lookupVal)

    const rows = await db
      .select()
      .from(users)
      .where(byEmail ? eq(users.email, lookupVal) : eq(users.username, lookupVal))
      .limit(1)

    console.log("[v0] Database query returned", rows.length, "rows")
    const user = rows[0]
    if (!user) {
      console.log("[v0] No user found for lookup value:", lookupVal)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("[v0] User found - id:", user.id, "username:", user.username, "email:", user.email)
    const hash = user.passwordHash
    console.log(
      "[v0] Password hash exists:",
      !!hash,
      "is string:",
      typeof hash === "string",
      "starts with $2:",
      typeof hash === "string" && hash.startsWith("$2"),
    )

    if (typeof hash !== "string" || !hash || !hash.startsWith("$2")) {
      // not a bcrypt hash → treat as invalid credentials (never 500)
      console.log("[v0] Invalid password hash format")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    let ok = false
    try {
      console.log("[v0] Comparing password with hash...")
      ok = await bcrypt.compare(password, hash)
      console.log("[v0] Password comparison result:", ok)
    } catch (err) {
      console.error("[v0] bcrypt.compare failed", err)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (!ok) {
      console.log("[v0] Password comparison failed - invalid credentials")
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("[v0] Password verified successfully, creating session...")
    const cookieVal = signCookie(user.id)
    if (!cookieVal) {
      console.log("[v0] Failed to sign cookie - SESSION_SECRET issue")
      return NextResponse.json({ error: "Server misconfigured: SESSION_SECRET missing/short" }, { status: 500 })
    }

    console.log("[v0] Login successful for user:", user.id)
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
    console.error("[v0] unhandled error", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

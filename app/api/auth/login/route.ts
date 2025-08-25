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

    // normalize email lookups if emails are stored lowercased
    const byEmail = emailOrUsername.includes("@")
    const lookupVal = byEmail ? emailOrUsername.toLowerCase() : emailOrUsername

    const rows = await db
      .select()
      .from(users)
      .where(byEmail ? eq(users.email, lookupVal) : eq(users.username, lookupVal))
      .limit(1)

    const user = rows[0]
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const hash: unknown = (user as any).password_hash

    if (typeof hash !== "string" || !hash || !hash.startsWith("$2")) {
      // not a bcrypt hash → treat as invalid credentials (never 500)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    let ok = false
    try {
      ok = await bcrypt.compare(password, hash)
    } catch (err) {
      console.error("[login] bcrypt.compare failed", err)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const cookieVal = signCookie((user as any).id)
    if (!cookieVal) {
      return NextResponse.json({ error: "Server misconfigured: SESSION_SECRET missing/short" }, { status: 500 })
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
    console.error("[login] unhandled error", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

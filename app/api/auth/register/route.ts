import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq, or } from "drizzle-orm"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  username: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

function signCookie(uid: string) {
  const secret = process.env.SESSION_SECRET || ""
  if (!secret) return null
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600
  const payload = Buffer.from(JSON.stringify({ uid, exp })).toString("base64url")
  let key: Buffer
  try {
    const b = Buffer.from(secret, "base64")
    key = b.length >= 32 ? b : Buffer.from(secret)
  } catch {
    key = Buffer.from(secret)
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

    const { username, email, password } = parsed.data
    const db = getDb()

    // Check for existing users
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)))
      .limit(1)

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: "Username or email already exists" }, { status: 409 })
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12)
    const userId = crypto.randomUUID()

    const newUsers = await db
      .insert(users)
      .values({
        id: userId,
        username,
        email,
        passwordHash: hashedPassword,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: users.id, username: users.username, email: users.email })

    const newUser = newUsers[0]
    if (!newUser) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    const cookieVal = signCookie(newUser.id)
    if (!cookieVal) {
      return NextResponse.json({ error: "Server misconfigured: missing env" }, { status: 500 })
    }

    const res = NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
    })

    res.cookies.set("session", cookieVal, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return res
  } catch (e) {
    console.error("[register] error", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

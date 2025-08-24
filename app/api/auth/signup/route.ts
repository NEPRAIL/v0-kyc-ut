import { type NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq, or } from "drizzle-orm"
import { lucia } from "@/lib/auth/lucia"
import { cookies } from "next/headers"
import { randomUUID } from "crypto"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Signup API called")

    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { username, password, email, name } = body

    if (!username || !password) {
      console.log("[v0] Missing required fields")
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    if (username.length < 3 || username.length > 31) {
      return NextResponse.json({ error: "Username must be between 3 and 31 characters" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    console.log("[v0] Getting database connection...")
    const db = getDb()

    console.log("[v0] Checking for existing user...")
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email || "")))
      .limit(1)

    if (existingUser.length > 0) {
      console.log("[v0] User already exists")
      return NextResponse.json({ error: "Username or email already taken" }, { status: 400 })
    }

    console.log("[v0] Hashing password...")
    const passwordHash = await hash(password, 12)
    const userId = randomUUID()

    console.log("[v0] Creating user in database...")
    await db.insert(users).values({
      id: userId,
      username,
      email: email || null,
      passwordHash,
      salt: "bcrypt_salt", // bcrypt handles salt internally
      emailVerified: false,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      failedLoginAttempts: 0,
    })

    console.log("[v0] User created successfully, creating session...")
    const luciaInstance = lucia()
    const session = await luciaInstance.createSession(userId, {})
    const sessionCookie = luciaInstance.createSessionCookie(session.id)

    const cookieStore = cookies()
    cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    console.log("[v0] Signup completed successfully")
    return NextResponse.json({
      success: true,
      user: { id: userId, username, email: email || null },
    })
  } catch (error) {
    console.error("[v0] Signup error:", error)
    return NextResponse.json(
      {
        error: "Failed to create account. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

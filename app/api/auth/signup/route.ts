import { type NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { lucia } from "@/lib/auth/lucia"
import { cookies } from "next/headers"
import { eq } from "drizzle-orm"
import { crypto } from "crypto"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Signup attempt started")
    const { username, password } = await request.json()
    console.log("[v0] Received signup data:", { username, passwordLength: password?.length })

    if (!username || !password) {
      console.log("[v0] Missing username or password")
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    if (username.length < 3 || username.length > 31) {
      return NextResponse.json({ error: "Username must be between 3 and 31 characters" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // Check if username already exists
    const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1)
    if (existingUser.length > 0) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 })
    }

    const passwordHash = await hash(password, 12)

    console.log("[v0] Creating user in database")
    const [user] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        username,
        passwordHash,
        role: "user",
      })
      .returning()

    console.log("[v0] User created successfully:", user.id)

    const session = await lucia.createSession(user.id, {})
    const sessionCookie = lucia.createSessionCookie(session.id)
    const cookieStore = await cookies()
    cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    console.log("[v0] Session created and cookie set")
    return NextResponse.json({ success: true, user: { id: user.id, username: user.username, role: user.role } })
  } catch (error) {
    console.error("[v0] Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { lucia } from "@/lib/auth/lucia"
import { cookies } from "next/headers"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
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

    const [user] = await db
      .insert(users)
      .values({
        username,
        passwordHash,
        role: "user",
      })
      .returning()

    const session = await lucia.createSession(user.id, {})
    const sessionCookie = lucia.createSessionCookie(session.id)
    cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username, role: user.role } })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

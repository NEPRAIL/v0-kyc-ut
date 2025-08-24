import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { lucia } from "@/lib/auth/lucia"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Login API called")

    const requestData = await request.json()
    console.log("[v0] Request data:", requestData)

    const { username, password } = requestData

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const db = await getDb()
    const user = await db.select().from(users).where(eq(users.email, username)).limit(1)

    if (user.length === 0) {
      console.log("[v0] User not found:", username)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const foundUser = user[0]
    console.log("[v0] User found:", foundUser.email)

    const isValidPassword = await bcrypt.compare(password, foundUser.passwordHash)

    if (!isValidPassword) {
      console.log("[v0] Invalid password for user:", username)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const session = await lucia.createSession(foundUser.id, {})
    const sessionCookie = lucia.createSessionCookie(session.id)

    const cookieStore = await cookies()
    cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    console.log("[v0] Login successful for user:", username)

    return NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
      },
    })
  } catch (error) {
    console.error("[v0] Login API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

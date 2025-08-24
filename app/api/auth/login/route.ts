import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Login API called")

    const body = await request.json()
    console.log("[v0] Request body:", JSON.stringify({ username: body.username, hasPassword: !!body.password }))

    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const users = await sql`
      SELECT id, username, email, password_hash, failed_login_attempts, locked_until
      FROM users 
      WHERE username = ${username} OR email = ${username}
      LIMIT 1
    `

    if (users.length === 0) {
      console.log("[v0] User not found:", username)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const user = users[0]
    console.log("[v0] Found user:", user.username, "with email:", user.email)

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / (1000 * 60))
      return NextResponse.json(
        { error: `Account is locked. Try again in ${remainingMinutes} minutes.` },
        { status: 423 },
      )
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      console.log("[v0] Invalid password for user:", username)

      const newAttempts = (user.failed_login_attempts || 0) + 1
      const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null

      await sql`
        UPDATE users 
        SET failed_login_attempts = ${newAttempts}, 
            locked_until = ${lockUntil},
            updated_at = NOW()
        WHERE id = ${user.id}
      `

      if (lockUntil) {
        return NextResponse.json({ error: "Too many failed attempts. Account locked for 15 minutes." }, { status: 423 })
      }

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    await sql`
      UPDATE users 
      SET failed_login_attempts = 0, 
          locked_until = NULL,
          last_login = NOW(),
          updated_at = NOW()
      WHERE id = ${user.id}
    `

    console.log("[v0] Login successful for user:", username)

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    })

    response.cookies.set("session", `session-${user.id}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
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

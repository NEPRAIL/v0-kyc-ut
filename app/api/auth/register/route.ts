import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Register API called")

    const { neon } = await import("@neondatabase/serverless")
    const bcrypt = await import("bcryptjs")
    const { randomUUID } = await import("crypto")

    if (!process.env.DATABASE_URL) {
      console.error("[v0] DATABASE_URL not found")
      return NextResponse.json({ error: "Database configuration error" }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL)

    const body = await request.json()
    console.log(
      "[v0] Register request:",
      JSON.stringify({
        username: body.username,
        email: body.email,
        hasPassword: !!body.password,
      }),
    )

    const { username, email, password, name } = body

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Username, email, and password are required" }, { status: 400 })
    }

    if (username.length < 3 || username.length > 31) {
      return NextResponse.json({ error: "Username must be between 3 and 31 characters" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    let existingUsers
    try {
      existingUsers = await sql`
        SELECT id FROM users WHERE email = ${email} OR username = ${username}
        LIMIT 1
      `
    } catch (dbError) {
      console.error("[v0] Database query error:", dbError)
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: "User with this email or username already exists" }, { status: 409 })
    }

    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)
    const userId = randomUUID()

    try {
      await sql`
        INSERT INTO users (
          id, username, email, password_hash, 
          email_verified, two_factor_enabled, failed_login_attempts,
          created_at, updated_at
        )
        VALUES (
          ${userId}, ${username}, ${email}, ${passwordHash},
          false, false, 0,
          NOW(), NOW()
        )
      `
    } catch (insertError) {
      console.error("[v0] User creation error:", insertError)
      return NextResponse.json({ error: "Failed to create user account" }, { status: 500 })
    }

    console.log("[v0] User created successfully:", username)

    const response = NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: userId,
        username,
        email,
      },
    })

    response.cookies.set("session", `session-${userId}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error("[v0] Register API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Simple login API called")

    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { username, password } = body

    const sql = neon(process.env.DATABASE_URL!)

    // Find user by username or email
    const users = await sql`
      SELECT id, username, email, password_hash 
      FROM users 
      WHERE username = ${username} OR email = ${username}
    `

    if (users.length === 0) {
      console.log("[v0] User not found:", username)
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        { status: 401 },
      )
    }

    const user = users[0]

    // Simple password check (in production, use bcrypt)
    if (user.password_hash !== password) {
      console.log("[v0] Password mismatch for user:", username)
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        { status: 401 },
      )
    }

    console.log("[v0] Login successful for:", username)

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    })

    // Set session cookie
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
        success: false,
        message: "Server error",
      },
      { status: 500 },
    )
  }
}

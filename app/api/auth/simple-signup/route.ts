import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Simple signup API called")

    const body = await request.json()
    console.log("[v0] Signup request:", body)

    const { username, password, email, name } = body

    // Simple validation
    if (!username || !password || !email) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required",
        },
        { status: 400 },
      )
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email} OR username = ${username}
    `

    if (existingUser.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "User already exists",
        },
        { status: 400 },
      )
    }

    // Insert new user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await sql`
      INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
      VALUES (${userId}, ${username}, ${email}, ${password}, NOW(), NOW())
    `

    console.log("[v0] User stored in database:", username)

    const response = NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: userId,
        username,
        email,
      },
    })

    // Set session cookie
    response.cookies.set("session", `session-${userId}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error("[v0] Signup API error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 },
    )
  }
}

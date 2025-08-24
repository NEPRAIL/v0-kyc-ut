import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"

// Ensure Node runtime (avoid edge+bcrypt issues)
export const runtime = "nodejs"
// (optional) if this route should never be cached
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    // Parse JSON safely
    const body = await request.json().catch(() =>
      null
    )
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { username, email, password } = body as {
      username?: string
      email?: string
      password?: string
    }

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are required" },
        { status: 400 }
      )
    }

    // Guard against missing env at request-time (so we can JSON-respond)
    const url = process.env.DATABASE_URL
    if (!url) {
      return NextResponse.json(
        { error: "Server misconfigured: DATABASE_URL is not set" },
        { status: 500 }
      )
    }

    // Create connection inside the handler (not at module top)
    const sql = neon(url)

    // Uniqueness check
    const existingUsers = await sql`
      SELECT id FROM users 
      WHERE username = ${username} OR email = ${email}
      LIMIT 1
    `
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Username or email already exists" },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const userId = randomUUID()

    const newUsers = await sql`
      INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
      VALUES (${userId}, ${username}, ${email}, ${hashedPassword}, NOW(), NOW())
      RETURNING id, username, email
    `
    const newUser = newUsers[0]

    const res = NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
    })

    res.cookies.set("session", `session-${newUser.id}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    })

    return res
  } catch (error) {
    console.error("[v0] Register API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

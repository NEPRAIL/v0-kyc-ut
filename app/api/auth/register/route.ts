import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"

// Ensure Node runtime (avoid edge+bcrypt issues)
export const runtime = "nodejs"
// (optional) if this route should never be cached
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  console.log("[v0] Register API called")
  try {
    // Parse JSON safely
    const body = await request.json().catch(() => null)
    console.log("[v0] Request body parsed:", body ? "success" : "failed")

    if (!body) {
      console.log("[v0] Invalid JSON body")
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { username, email, password } = body as {
      username?: string
      email?: string
      password?: string
    }
    console.log("[v0] Registration request:", { username, email, password: password ? "***" : undefined })

    if (!username || !email || !password) {
      console.log("[v0] Missing required fields")
      return NextResponse.json({ error: "Username, email, and password are required" }, { status: 400 })
    }

    // Guard against missing env at request-time (so we can JSON-respond)
    const url = process.env.DATABASE_URL
    if (!url) {
      console.log("[v0] DATABASE_URL not set")
      return NextResponse.json({ error: "Server misconfigured: DATABASE_URL is not set" }, { status: 500 })
    }

    console.log("[v0] Creating database connection")
    // Create connection inside the handler (not at module top)
    const sql = neon(url)

    console.log("[v0] Checking for existing users")
    // Uniqueness check
    const existingUsers = await sql`
      SELECT id FROM users 
      WHERE username = ${username} OR email = ${email}
      LIMIT 1
    `
    console.log("[v0] Existing users check result:", existingUsers.length)

    if (existingUsers.length > 0) {
      console.log("[v0] User already exists")
      return NextResponse.json({ error: "Username or email already exists" }, { status: 409 })
    }

    console.log("[v0] Hashing password")
    const hashedPassword = await bcrypt.hash(password, 12)
    const userId = randomUUID()
    console.log("[v0] Generated user ID:", userId)

    console.log("[v0] Inserting new user")
    const newUsers = await sql`
      INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
      VALUES (${userId}, ${username}, ${email}, ${hashedPassword}, NOW(), NOW())
      RETURNING id, username, email
    `
    const newUser = newUsers[0]
    console.log("[v0] User created successfully:", { id: newUser.id, username: newUser.username, email: newUser.email })

    const res = NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
    })

    console.log("[v0] Setting session cookie")
    res.cookies.set("session", `session-${newUser.id}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    })

    console.log("[v0] Registration completed successfully")
    return res
  } catch (error) {
    console.error("[v0] Register API error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

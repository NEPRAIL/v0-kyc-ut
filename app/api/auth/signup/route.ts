import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { users, sessions } from "@/lib/db/schema"
import { signupSchema } from "@/lib/validation"
import { hashPassword, randomId, signSession } from "@/lib/security"
import { checkRateLimit } from "@/lib/rate-limit"
import { eq, or } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Signup API called")

    // Rate limiting
    const clientIP = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    console.log("[v0] Client IP:", clientIP)

    const rateLimitResult = await checkRateLimit(`signup:${clientIP}`, { requests: 3, window: 300 })
    console.log("[v0] Rate limit result:", rateLimitResult)

    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 })
    }

    // Parse and validate JSON
    const body = await request.json().catch(() => null)
    console.log("[v0] Request body:", body)

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 })
    }

    const validation = signupSchema.safeParse(body)
    console.log("[v0] Validation result:", validation.success)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          code: "VALIDATION_ERROR",
          issues: validation.error.issues,
        },
        { status: 400 },
      )
    }

    const { username, email, password } = validation.data

    // Check environment
    const sessionSecret = process.env.SESSION_SECRET
    if (!sessionSecret) {
      console.log("[v0] Missing SESSION_SECRET")
      return NextResponse.json(
        { error: "Server misconfigured: missing SESSION_SECRET", code: "SERVER_ERROR" },
        { status: 500 },
      )
    }

    console.log("[v0] Getting database connection")
    // Database operations
    const db = getDb()

    console.log("[v0] Checking for existing users")
    // Check for existing users
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)))
      .limit(1)

    if (existingUsers.length > 0) {
      console.log("[v0] User already exists")
      return NextResponse.json({ error: "Username or email already exists", code: "USER_EXISTS" }, { status: 409 })
    }

    console.log("[v0] Hashing password")
    // Create user
    const userId = randomId("usr_")
    const passwordHash = await hashPassword(password)

    console.log("[v0] Creating user in database")
    const newUsers = await db
      .insert(users)
      .values({
        id: userId,
        username,
        email,
        passwordHash,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: users.id, username: users.username, email: users.email })

    const newUser = newUsers[0]
    console.log("[v0] User created:", newUser.id)

    // Create session
    const sessionId = randomId("sess_")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    console.log("[v0] Creating session")
    await db.insert(sessions).values({
      id: sessionId,
      userId: newUser.id,
      expiresAt,
    })

    // Sign session cookie
    console.log("[v0] Signing session cookie")
    const sessionCookie = signSession({ uid: newUser.id, exp: expiresAt.getTime() }, sessionSecret)

    const response = NextResponse.json({
      success: true,
      message: "Account created successfully",
      userId: newUser.id,
    })

    response.headers.set("Set-Cookie", sessionCookie)
    console.log("[v0] Signup successful")

    return response
  } catch (error) {
    console.error("[v0] Signup API error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "SERVER_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

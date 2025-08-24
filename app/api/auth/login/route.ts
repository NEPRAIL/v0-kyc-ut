import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { users, sessions, securityEvents } from "@/lib/db/schema"
import { loginSchema } from "@/lib/validation"
import { verifyPassword, randomId, signSession } from "@/lib/security"
import { checkRateLimit } from "@/lib/rate-limit"
import { eq, or } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const rateLimitResult = await checkRateLimit(`login:${clientIP}`, { requests: 5, window: 300 })

    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 })
    }

    // Parse and validate JSON
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 })
    }

    const validation = loginSchema.safeParse(body)
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

    const { emailOrUsername, password } = validation.data

    // Check environment
    const sessionSecret = process.env.SESSION_SECRET
    if (!sessionSecret) {
      return NextResponse.json(
        { error: "Server misconfigured: missing SESSION_SECRET", code: "SERVER_ERROR" },
        { status: 500 },
      )
    }

    // Database operations
    const db = getDb()

    // Find user by email or username
    const userResults = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(or(eq(users.email, emailOrUsername), eq(users.username, emailOrUsername)))
      .limit(1)

    if (userResults.length === 0) {
      // Log failed login attempt
      await db
        .insert(securityEvents)
        .values({
          eventType: "login_failed",
          ipAddress: clientIP,
          userAgent: request.headers.get("user-agent") || "",
          metadata: { reason: "user_not_found", identifier: emailOrUsername },
        })
        .catch(() => {}) // Don't fail login on logging error

      return NextResponse.json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" }, { status: 401 })
    }

    const user = userResults[0]

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)

    if (!isValidPassword) {
      // Log failed login attempt
      await db
        .insert(securityEvents)
        .values({
          userId: user.id,
          eventType: "login_failed",
          ipAddress: clientIP,
          userAgent: request.headers.get("user-agent") || "",
          metadata: { reason: "invalid_password" },
        })
        .catch(() => {})

      return NextResponse.json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" }, { status: 401 })
    }

    // Create session
    const sessionId = randomId("sess_")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
    })

    // Log successful login
    await db
      .insert(securityEvents)
      .values({
        userId: user.id,
        eventType: "login_success",
        ipAddress: clientIP,
        userAgent: request.headers.get("user-agent") || "",
        metadata: { sessionId },
      })
      .catch(() => {})

    // Sign session cookie
    const sessionCookie = signSession({ uid: user.id, exp: expiresAt.getTime() }, sessionSecret)

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    })

    response.headers.set("Set-Cookie", sessionCookie)

    return response
  } catch (error) {
    console.error("[v0] Login API error:", error)
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

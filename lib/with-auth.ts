import { type NextRequest, NextResponse } from "next/server"
import "server-only"
import { verifySession } from "@/lib/security"

/**
 * Authenticates a user from a NextRequest object using session cookies
 * Returns either user authentication info or a Response object (error)
 */
export async function requireUser(request: NextRequest): Promise<{ userId: string } | Response> {
  try {
    // Get session cookie from the request
    const sessionCookie = request.cookies.get("session")?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the session
    const session = await verifySession(sessionCookie)

    if (!session?.uid) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    // Return user authentication info
    return { userId: session.uid }
  } catch (error) {
    console.error("[v0] requireUser authentication error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { lucia } from "@/lib/auth/lucia"
import { cookies } from "next/headers"
import { eq } from "drizzle-orm"
import { verifyTOTP } from "@/lib/auth/totp"

export async function POST(request: NextRequest) {
  try {
    const { username, password, totpToken } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)
    if (!user) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 400 })
    }

    const validPassword = await compare(password, user.passwordHash)
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 400 })
    }

    // Check TOTP if enabled
    if (user.totpSecret) {
      if (!totpToken) {
        return NextResponse.json({ error: "TOTP token required", requiresTotp: true }, { status: 400 })
      }

      const validTotp = verifyTOTP(user.totpSecret, totpToken)
      if (!validTotp) {
        return NextResponse.json({ error: "Invalid TOTP token" }, { status: 400 })
      }
    }

    const session = await lucia.createSession(user.id, {})
    const sessionCookie = lucia.createSessionCookie(session.id)
    cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        hasTotpEnabled: !!user.totpSecret,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

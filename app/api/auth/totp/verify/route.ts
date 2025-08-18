import { type NextRequest, NextResponse } from "next/server"
import { validateRequest } from "@/lib/auth/lucia"
import { verifyTOTP } from "@/lib/auth/totp"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { token, disable } = await request.json()

    if (disable) {
      // Disable TOTP
      await db.update(users).set({ totpSecret: null }).where(eq(users.id, user.id))

      return NextResponse.json({ success: true, message: "TOTP disabled" })
    }

    if (!token) {
      return NextResponse.json({ error: "TOTP token is required" }, { status: 400 })
    }

    // Get current user data
    const [currentUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
    if (!currentUser || !currentUser.totpSecret) {
      return NextResponse.json({ error: "TOTP not set up" }, { status: 400 })
    }

    const isValid = verifyTOTP(currentUser.totpSecret, token)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid TOTP token" }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "TOTP verified successfully" })
  } catch (error) {
    console.error("TOTP verify error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

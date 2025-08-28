import { type NextRequest, NextResponse } from "next/server"
import { validateRequest } from "@/lib/auth/lucia"
import { verifyTotpToken } from "@/lib/security"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const verifyTotpSchema = z.object({
  token: z.string().optional(),
  disable: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { token, disable } = verifyTotpSchema.parse(body)

    if (disable) {
      // Disable TOTP
      await db.update(users).set({ twoFactorSecret: null, twoFactorEnabled: false }).where(eq(users.id, user.id))
      return NextResponse.json({ success: true, message: "TOTP disabled" })
    }

    if (!token) {
      return NextResponse.json({ error: "TOTP token is required" }, { status: 400 })
    }

    // Get current user data
  const [currentUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  if (!currentUser || !currentUser.twoFactorSecret) {
      return NextResponse.json({ error: "TOTP not set up" }, { status: 400 })
    }

  const isValid = verifyTotpToken({ token, secret: currentUser.twoFactorSecret })
    if (!isValid) {
      return NextResponse.json({ error: "Invalid TOTP token" }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "TOTP verified successfully" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
    }
    console.error("TOTP verify error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

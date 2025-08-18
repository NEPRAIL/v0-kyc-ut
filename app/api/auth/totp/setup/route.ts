import { type NextRequest, NextResponse } from "next/server"
import { validateRequest } from "@/lib/auth/lucia"
import { generateTOTPSecret, generateTOTPUri, generateQRCodeUrl } from "@/lib/auth/totp"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Generate new TOTP secret
    const secret = generateTOTPSecret()
    const uri = generateTOTPUri(secret, user.username)
    const qrCodeUrl = generateQRCodeUrl(uri)

    // Store the secret temporarily (not activated until verified)
    await db.update(users).set({ totpSecret: secret }).where(eq(users.id, user.id))

    return NextResponse.json({
      secret,
      uri,
      qrCodeUrl,
      manualEntryKey: secret,
    })
  } catch (error) {
    console.error("TOTP setup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

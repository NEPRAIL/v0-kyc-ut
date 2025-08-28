import { type NextRequest, NextResponse } from "next/server"
import { validateRequest } from "@/lib/auth/lucia"
import { issueTotpSecret, buildTotpURI } from "@/lib/security"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { user } = await validateRequest()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const secret = issueTotpSecret()
    const uri = buildTotpURI({ secret, label: user.username, issuer: "KYCut" })

  // Store the secret temporarily in twoFactorSecret field
  await db.update(users).set({ twoFactorSecret: secret, twoFactorEnabled: false }).where(eq(users.id, user.id))

    return NextResponse.json({
      secret,
      uri,
      manualEntryKey: secret,
    })
  } catch (error) {
    console.error("TOTP setup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

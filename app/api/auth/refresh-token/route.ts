import { NextResponse } from "next/server"
import { getAuthFromRequest, issueBotToken } from "@/lib/auth-server"
import { getDb } from "@/lib/db"
import { telegramLinks } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const auth = await getAuthFromRequest()
    if (!auth?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { telegramUserId } = await req.json()
    if (!telegramUserId) {
      return NextResponse.json({ error: "Telegram user ID required" }, { status: 400 })
    }

    const db = getDb()

    // Verify the Telegram link belongs to the authenticated user
    const link = await db.select().from(telegramLinks).where(eq(telegramLinks.telegramUserId, telegramUserId)).limit(1)

    if (!link[0] || link[0].userId !== auth.userId) {
      return NextResponse.json({ error: "Telegram account not linked to this user" }, { status: 403 })
    }

    // Issue new bot token
    const { token, expiresAt } = await issueBotToken(auth.userId, telegramUserId, 30)

    console.log(`[auth/refresh-token] Refreshed bot token for user ${auth.userId}, Telegram ${telegramUserId}`)

    return NextResponse.json({
      success: true,
      botToken: token,
      expiresAt: expiresAt.toISOString(),
      message: "Bot token refreshed successfully",
    })
  } catch (error) {
    console.error("[auth/refresh-token] Error:", error)
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 })
  }
}

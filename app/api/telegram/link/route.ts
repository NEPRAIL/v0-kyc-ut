import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { telegramLinkingCodes, telegramLinks } from "@/lib/db/schema"
import { eq, and, gt, isNull } from "drizzle-orm"
import { issueBotToken, requireAuth } from "@/lib/auth-server"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    // If a session cookie exists and is valid, prefer that (browser flow).
    // Only enforce webhook secret when there is no session auth.
    const auth = await requireAuth()
    const secret = process.env.WEBHOOK_SECRET
    const hdr = req.headers.get("x-webhook-secret")
    if (!auth.ok && secret && hdr !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code, telegramUserId, telegramUsername } = await req.json()

    if (!code || !telegramUserId) {
      return NextResponse.json({ error: "Code and Telegram user ID required" }, { status: 400 })
    }

    const rateLimitKey = `tg:verify-code:${telegramUserId}`
    const rateLimit = await checkRateLimit(rateLimitKey, { requests: 5, window: 60 })
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const db = getDb()
    const now = new Date()

    // Find valid, unused, non-expired code
    const linkingCodes = await db
      .select()
      .from(telegramLinkingCodes)
      .where(
        and(
          eq(telegramLinkingCodes.code, code.toUpperCase()),
          gt(telegramLinkingCodes.expiresAt, now),
          isNull(telegramLinkingCodes.usedAt),
        ),
      )
      .limit(1)

    if (linkingCodes.length === 0) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
    }

    const linkingCode = linkingCodes[0]

    // Mark code as used
    await db.update(telegramLinkingCodes).set({ usedAt: now }).where(eq(telegramLinkingCodes.code, code.toUpperCase()))

    const existing = await db.query.telegramLinks.findFirst({
      where: eq(telegramLinks.telegramUserId, telegramUserId),
    })

    if (existing) {
      await db
        .update(telegramLinks)
        .set({
          userId: linkingCode.userId,
          telegramUsername: telegramUsername || null,
          linkedVia: "code",
          isRevoked: false,
          updatedAt: new Date(),
        })
        .where(eq(telegramLinks.telegramUserId, telegramUserId))
    } else {
      await db.insert(telegramLinks).values({
        telegramUserId,
        userId: linkingCode.userId,
        telegramUsername: telegramUsername || null,
        linkedVia: "code",
        isRevoked: false,
      })
    }

    const { token, expiresAt } = await issueBotToken(linkingCode.userId, telegramUserId, 30)

    console.log(`[telegram/verify-code] Successfully linked user ${linkingCode.userId} to Telegram ${telegramUserId}`)

    return NextResponse.json({
      success: true,
      message: "Account linked successfully",
      botToken: token,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error("[telegram/verify-code] error:", error)
    return NextResponse.json({ error: "Failed to verify linking code" }, { status: 500 })
  }
}

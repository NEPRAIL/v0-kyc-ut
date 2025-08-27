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
    const auth = await requireAuth()
    const secret = process.env.WEBHOOK_SECRET
    const authHeader = req.headers.get("authorization")
    const webhookSecret = req.headers.get("x-webhook-secret")

    // Allow if: 1) Valid session auth, 2) Valid webhook secret, 3) Valid bot token
    const hasValidAuth = auth.ok || (secret && webhookSecret === secret) || authHeader?.startsWith("Bearer ")

    if (!hasValidAuth) {
      console.log("[telegram/link] Unauthorized request - no valid auth method")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { code, telegramUserId, telegramUsername } = await req.json()

    if (!code || !telegramUserId) {
      return NextResponse.json({ error: "Code and Telegram user ID required" }, { status: 400 })
    }

    const rateLimitKey = `tg:link:${telegramUserId}`
    const rateLimit = await checkRateLimit(rateLimitKey, { requests: 5, window: 60 })
    if (!rateLimit.success) {
      console.log(`[telegram/link] Rate limit exceeded for Telegram user ${telegramUserId}`)
      return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 })
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

    // Basic validation: linkingCode must include a userId
    if (!linkingCode.userId) {
      console.error("[telegram/link] linking code missing userId", linkingCode)
      return NextResponse.json({ error: "Linking code not associated with a user" }, { status: 400 })
    }

    // Mark code as used
    await db.update(telegramLinkingCodes).set({ usedAt: now }).where(eq(telegramLinkingCodes.code, code.toUpperCase()))

    const existingRows = await db
      .select()
      .from(telegramLinks)
      .where(eq(telegramLinks.telegramUserId, telegramUserId))
      .limit(1)

    const existing = existingRows && existingRows.length ? existingRows[0] : null

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

    let token
    let expiresAt
    try {
      const issued = await issueBotToken(linkingCode.userId, telegramUserId, 30)
      token = issued.token
      expiresAt = issued.expiresAt
    } catch (err) {
      console.error("[telegram/link] issueBotToken failed:", err)
      return NextResponse.json({ error: "Failed to issue bot token", details: err?.message || String(err) }, { status: 500 })
    }

    console.log(`[telegram/link] Successfully linked user ${linkingCode.userId} to Telegram ${telegramUserId}`)

    return NextResponse.json({
      success: true,
      message: "Account linked successfully",
      botToken: token,
      expiresAt: expiresAt.toISOString(),
      userId: linkingCode.userId,
      telegramUserId: telegramUserId,
    })
  } catch (error) {
    console.error("[telegram/link] error:", error)
    const payload: any = { error: "Failed to verify linking code" }
    if (process.env.NODE_ENV !== "production") payload.details = error?.message || String(error)
    return NextResponse.json(payload, { status: 500 })
  }
}

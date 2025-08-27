import { NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "@/lib/db"
import { telegramLinks, users } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { issueBotToken } from "@/lib/auth-server"
import { checkRateLimit } from "@/lib/rate-limit"

const reqSchema = z.object({
  telegramUserId: z.number().int().positive(),
})

export async function POST(req: Request) {
  try {
    const secret = process.env.WEBHOOK_SECRET
    const hdr = req.headers.get("x-webhook-secret")
    if (secret && hdr !== secret) {
      console.log("[v0] Telegram ensure-session: Invalid webhook secret")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { telegramUserId } = reqSchema.parse(body)

    console.log("[v0] Telegram ensure-session request for user:", telegramUserId)

    const rateLimitKey = `tg:ensure-session:${telegramUserId}`
    const rateLimit = await checkRateLimit(rateLimitKey, { requests: 10, window: 60 })
    if (!rateLimit.success) {
      console.log("[v0] Rate limit exceeded for Telegram user:", telegramUserId)
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const db = getDb()
    const linkRows = await db
      .select()
      .from(telegramLinks)
      .where(and(eq(telegramLinks.telegramUserId, telegramUserId), eq(telegramLinks.isRevoked, false)))
      .limit(1)
    const link = linkRows && linkRows.length ? linkRows[0] : null

    if (!link) {
      console.log("[v0] No linked account found for Telegram user:", telegramUserId)
      return NextResponse.json({ error: "No linked account for this Telegram user" }, { status: 404 })
    }

    // Ensure the user still exists
  const userRows = await db.select().from(users).where(eq(users.id, link.userId)).limit(1)
  const user = userRows && userRows.length ? userRows[0] : null
    if (!user) {
      console.log("[v0] Linked user no longer exists, revoking link for:", link.userId)
      // revoke link
      await db
        .update(telegramLinks)
        .set({ isRevoked: true, updatedAt: new Date() })
        .where(eq(telegramLinks.telegramUserId, telegramUserId))
      return NextResponse.json({ error: "Linked user no longer exists" }, { status: 410 })
    }

    const { token, expiresAt } = await issueBotToken(link.userId, telegramUserId, 30)
    console.log("[v0] Successfully issued bot token for user:", link.userId, "telegram:", telegramUserId)

    return NextResponse.json({
      success: true,
      userId: link.userId,
      botToken: token, // the bot stores this (DON'T log it)
      expiresAt: expiresAt.toISOString(),
    })
  } catch (err: any) {
    console.error("[v0] Telegram ensure-session error:", err)
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", issues: err.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

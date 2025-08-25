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
    // Optional shared secret header to limit access
    const secret = process.env.WEBHOOK_SECRET
    const hdr = req.headers.get("x-webhook-secret")
    if (secret && hdr !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { telegramUserId } = reqSchema.parse(body)

    const rateLimitKey = `tg:ensure-session:${telegramUserId}`
    const rateLimit = await checkRateLimit(rateLimitKey, { requests: 10, window: 60 })
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const db = getDb()
    const link = await db.query.telegramLinks.findFirst({
      where: and(eq(telegramLinks.telegramUserId, telegramUserId), eq(telegramLinks.isRevoked, false)),
    })

    if (!link) {
      console.error("[telegram/ensure-session] No linked account for Telegram user:", telegramUserId)
      return NextResponse.json({ error: "No linked account for this Telegram user" }, { status: 404 })
    }

    // Ensure the user still exists
    const user = await db.query.users.findFirst({ where: eq(users.id, link.userId) })
    if (!user) {
      console.error("[telegram/ensure-session] Linked user no longer exists:", link.userId)
      // revoke link
      await db
        .update(telegramLinks)
        .set({ isRevoked: true, updatedAt: new Date() })
        .where(eq(telegramLinks.telegramUserId, telegramUserId))
      return NextResponse.json({ error: "Linked user no longer exists" }, { status: 410 })
    }

    const { token, expiresAt } = await issueBotToken(link.userId, telegramUserId, 30)
    console.log("[telegram/ensure-session] Issued bot token for user:", link.userId)

    return NextResponse.json({
      success: true,
      userId: link.userId,
      botToken: token, // the bot stores this (DON'T log it)
      expiresAt: expiresAt.toISOString(),
    })
  } catch (err: any) {
    console.error("[telegram/ensure-session] error:", err)
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", issues: err.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

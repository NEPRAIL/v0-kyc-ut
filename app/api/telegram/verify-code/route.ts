import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { telegramLinkingCodes, telegramLinks } from "@/lib/db/schema"
import { eq, and, gt, isNull } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { code, telegramUserId, telegramUsername } = await req.json()

    if (!code || !telegramUserId) {
      return NextResponse.json({ error: "Code and Telegram user ID required" }, { status: 400 })
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

    // Create or update Telegram link
    await db
      .insert(telegramLinks)
      .values({
        userId: linkingCode.userId,
        telegramUserId: telegramUserId.toString(),
        telegramUsername: telegramUsername || null,
      })
      .onConflictDoUpdate({
        target: telegramLinks.userId,
        set: {
          telegramUserId: telegramUserId.toString(),
          telegramUsername: telegramUsername || null,
        },
      })

    console.log(`[v0] Successfully linked user ${linkingCode.userId} to Telegram ${telegramUserId}`)

    return NextResponse.json({
      success: true,
      message: "Telegram account successfully linked!",
    })
  } catch (error) {
    console.error("[v0] Verify linking code error:", error)
    return NextResponse.json({ error: "Failed to verify linking code" }, { status: 500 })
  }
}

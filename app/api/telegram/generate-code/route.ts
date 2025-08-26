import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { getDb } from "@/lib/db"
import { telegramLinkingCodes } from "@/lib/db/schema"
import { eq, and, gt, isNull } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function generateLinkingCode(): string {
  // Generate 8-character alphanumeric code (excluding confusing characters)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST() {
  try {
    const auth = await requireAuth()
    if (!auth.ok) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const db = getDb()
    const now = new Date()

    await db
      .delete(telegramLinkingCodes)
      .where(and(eq(telegramLinkingCodes.userId, auth.userId), gt(now, telegramLinkingCodes.expiresAt)))

    // Check for existing active codes (not expired and not used)
    const existingCodes = await db
      .select()
      .from(telegramLinkingCodes)
      .where(
        and(
          eq(telegramLinkingCodes.userId, auth.userId),
          gt(telegramLinkingCodes.expiresAt, now),
          isNull(telegramLinkingCodes.usedAt),
        ),
      )

    if (existingCodes.length > 0) {
      // Return existing active code
      const code = existingCodes[0]
      console.log(`[v0] Returning existing linking code ${code.code} for user ${auth.userId}`)
      return NextResponse.json({
        success: true,
        code: code.code,
        expiresAt: code.expiresAt,
        isNew: false,
      })
    }

    // Generate new code
    let code: string
    let attempts = 0
    do {
      code = generateLinkingCode()
      attempts++
      if (attempts > 10) {
        throw new Error("Failed to generate unique code")
      }
    } while (
      await db
        .select()
        .from(telegramLinkingCodes)
        .where(eq(telegramLinkingCodes.code, code))
        .then((r) => r.length > 0)
    )

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Insert new code
    await db.insert(telegramLinkingCodes).values({
      code,
      userId: auth.userId,
      expiresAt,
    })

    console.log(
      `[v0] Generated new linking code ${code} for user ${auth.userId}, expires at ${expiresAt.toISOString()}`,
    )

    return NextResponse.json({
      success: true,
      code,
      expiresAt,
      isNew: true,
    })
  } catch (error) {
    console.error("[v0] Generate linking code error:", error)
    return NextResponse.json({ error: "Failed to generate linking code" }, { status: 500 })
  }
}

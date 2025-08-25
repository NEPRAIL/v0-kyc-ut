import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { getDb } from "@/lib/db"
import { telegramLinkingCodes } from "@/lib/db/schema"
import { eq, and, gt } from "drizzle-orm"

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

    // Check for existing active codes (not expired and not used)
    const now = new Date()
    const existingCodes = await db
      .select()
      .from(telegramLinkingCodes)
      .where(
        and(
          eq(telegramLinkingCodes.userId, auth.userId),
          gt(telegramLinkingCodes.expiresAt, now),
          eq(telegramLinkingCodes.usedAt, null),
        ),
      )

    if (existingCodes.length > 0) {
      // Return existing active code
      const code = existingCodes[0]
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

    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Insert new code
    await db.insert(telegramLinkingCodes).values({
      code,
      userId: auth.userId,
      expiresAt,
    })

    console.log(`[v0] Generated linking code ${code} for user ${auth.userId}`)

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

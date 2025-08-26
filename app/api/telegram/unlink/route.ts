import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { getDb } from "@/lib/db"
import { telegramLinks } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Telegram unlink request started")

    const auth = await requireAuth()
    if (!auth.ok) {
      console.log("[v0] Authentication failed for unlink request")
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", auth.userId)

    const db = getDb()

    // Check if user has a Telegram link
    const existingLink = await db.query.telegramLinks.findFirst({
      where: eq(telegramLinks.userId, auth.userId),
    })

    if (!existingLink) {
      console.log("[v0] No Telegram link found for user:", auth.userId)
      return NextResponse.json({ error: "No Telegram account linked" }, { status: 404 })
    }

    console.log("[v0] Found Telegram link for user:", auth.userId, "telegram ID:", existingLink.telegramUserId)

    // Delete the Telegram link for this user
    const result = await db.delete(telegramLinks).where(eq(telegramLinks.userId, auth.userId))

    console.log("[v0] Successfully unlinked Telegram account for user:", auth.userId)

    return NextResponse.json({
      success: true,
      message: "Telegram account unlinked successfully",
    })
  } catch (error) {
    console.error("[v0] Error unlinking Telegram:", error)
    return NextResponse.json({ error: "Failed to unlink account" }, { status: 500 })
  }
}

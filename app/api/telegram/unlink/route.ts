import { type NextRequest, NextResponse } from "next/server"
import { getAuthFromRequest } from "@/lib/auth-server"
import { db } from "@/lib/db"
import { telegramLinks } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth.ok) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Delete the Telegram link for this user
    await db.delete(telegramLinks).where(eq(telegramLinks.userId, auth.userId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unlinking Telegram:", error)
    return NextResponse.json({ error: "Failed to unlink account" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { verifyTelegramAuth } from "@/lib/telegram"
import { requireAuth } from "@/lib/auth-server"
import { getDb } from "@/lib/db"
import { telegramLinks } from "@/lib/db/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const auth = await requireAuth()
    if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const url = new URL(req.url)
    const params = url.searchParams

    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })

    const ok = verifyTelegramAuth(params, token)
    if (!ok) return NextResponse.json({ error: "Invalid Telegram login" }, { status: 400 })

    const tgId = params.get("id")!
    const tgUsername = params.get("username") || null

    const db = getDb()
    await db
      .insert(telegramLinks)
      .values({ userId: auth.userId, telegramUserId: tgId, telegramUsername: tgUsername })
      .onConflictDoUpdate({
        target: telegramLinks.userId,
        set: { telegramUserId: tgId, telegramUsername: tgUsername },
      })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[telegram link] error", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, linkingCodes } from "@/drizzle/schema"
import { eq, and } from "drizzle-orm"
import { requireWebhook } from "@/lib/auth-server"

export async function POST(req: Request) {
  if (!(await requireWebhook())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { code, telegramUserId, telegramUsername } = await req.json()
    if (!code || !telegramUserId) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

    const [lc] = await db.select().from(linkingCodes).where(eq(linkingCodes.code, code)).limit(1)
    if (!lc) return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    if (lc.used) return NextResponse.json({ error: "Code already used" }, { status: 400 })
    if (new Date(lc.expiresAt) < new Date()) return NextResponse.json({ error: "Code expired" }, { status: 400 })

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ telegramUserId: Number(telegramUserId), telegramUsername })
        .where(eq(users.id, lc.userId))
      await tx
        .update(linkingCodes)
        .set({ used: true })
        .where(and(eq(linkingCodes.code, code), eq(linkingCodes.userId, lc.userId)))
    })

    return NextResponse.json({ success: true, message: "Account linked" })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

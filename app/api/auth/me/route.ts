import { NextResponse } from "next/server"
import { getAuthFromRequest } from "@/lib/auth-server"
import { getDb } from "@/lib/db"
import { users, telegramLinks } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const auth = await getAuthFromRequest()

    if (!auth?.userId) {
      return NextResponse.json({
        authenticated: false,
        uid: null,
        user: null,
        telegram: null,
      })
    }

    const db = getDb()

    // Get user information
    const user = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        emailVerified: users.emailVerified,
        twoFactorEnabled: users.twoFactorEnabled,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    // Get Telegram link information
    const telegramLink = await db
      .select({
        telegramUserId: telegramLinks.telegramUserId,
        telegramUsername: telegramLinks.telegramUsername,
        linkedVia: telegramLinks.linkedVia,
        lastSeenAt: telegramLinks.lastSeenAt,
        botTokenExpiresAt: telegramLinks.botTokenExpiresAt,
      })
      .from(telegramLinks)
      .where(eq(telegramLinks.userId, auth.userId))
      .limit(1)

    const userData = user[0] || null
    const telegramData = telegramLink[0] || null

    const res = NextResponse.json({
      authenticated: true,
      uid: auth.userId,
      user: userData
        ? {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            emailVerified: userData.emailVerified,
            twoFactorEnabled: userData.twoFactorEnabled,
            lastLogin: userData.lastLogin,
            createdAt: userData.createdAt,
          }
        : null,
      telegram: telegramData
        ? {
            telegramUserId: telegramData.telegramUserId,
            telegramUsername: telegramData.telegramUsername,
            linkedVia: telegramData.linkedVia,
            lastSeenAt: telegramData.lastSeenAt,
            tokenExpiresAt: telegramData.botTokenExpiresAt,
            isConnected: true,
          }
        : null,
      session: {
        type: req.headers.get("authorization") ? "bot_token" : "session_cookie",
        timestamp: new Date().toISOString(),
      },
    })

    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    return res
  } catch (e) {
    console.error("[auth/me] Error:", e)
    return NextResponse.json(
      {
        authenticated: false,
        uid: null,
        user: null,
        telegram: null,
        error: "Authentication check failed",
      },
      { status: 200 },
    )
  }
}

import { NextResponse } from "next/server"
import { requireAuth, getUserBotSessions } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const auth = await requireAuth()
    if (!auth.ok) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const sessions = await getUserBotSessions(auth.userId)

    return NextResponse.json({
      success: true,
      sessions: sessions.map((session) => ({
        telegramUserId: session.telegramUserId,
        telegramUsername: session.telegramUsername,
        linkedVia: session.linkedVia,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
        isActive: session.expiresAt ? new Date(session.expiresAt) > new Date() : false,
      })),
      metadata: {
        totalSessions: sessions.length,
        activeSessions: sessions.filter((s) => s.expiresAt && new Date(s.expiresAt) > new Date()).length,
      },
    })
  } catch (error) {
    console.error("[auth/sessions] Error:", error)
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
  }
}

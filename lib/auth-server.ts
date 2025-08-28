import "server-only"
import { cookies, headers } from "next/headers"
import { verifySession } from "@/lib/security"
import { getDb } from "@/lib/db"
import { eq, and, gt } from "drizzle-orm"
import { telegramLinks } from "@/lib/db/schema"
import { botTokenFromAuthHeader, hashBotToken, generateBotToken } from "@/lib/bot-auth"
import { addDays } from "date-fns"

export async function requireAuth() {
  const cookieStore = await cookies()
  const raw = cookieStore.get("session")?.value
  if (!raw) return { ok: false as const, status: 401 as const }
  const session = await verifySession(raw)
  if (!session?.uid) return { ok: false as const, status: 401 as const }
  return { ok: true as const, userId: session.uid, session }
}

export async function verifySessionTolerant(cookieVal?: string): Promise<{ userId: string; role?: string } | null> {
  if (!cookieVal) return null
  const session = await verifySession(cookieVal)
  if (!session?.uid) return null

  // For now, return basic session info - can be enhanced with role lookup from DB if needed
  return { userId: session.uid, role: "user" }
}

// Returns { userId } if authenticated via cookie session OR bot token
export async function getAuthFromRequest(): Promise<{ userId: string } | null> {
  // 1) try cookie session (browser)
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session")?.value
  if (sessionCookie) {
    const s = await verifySession(sessionCookie)
    if (s?.uid) return { userId: s.uid }
  }

  // 2) try bot token (Authorization header)
  const hdrs = await headers()
  const authHeader = hdrs.get("authorization")
  if (authHeader) {
    const token = botTokenFromAuthHeader(new Request("http://local", { headers: { authorization: authHeader } }))
    if (token) {
      const db = getDb()
      const hash = hashBotToken(token)
      const now = new Date()
      const rows = await db
        .select()
        .from(telegramLinks)
        .where(
          and(
            eq(telegramLinks.botTokenHash, hash),
            eq(telegramLinks.isRevoked, false),
            gt(telegramLinks.botTokenExpiresAt, now),
          ),
        )
        .limit(1)
      const row = rows && rows.length ? rows[0] : null
      if (row?.userId) {
        // Check if token expires within 7 days and refresh if needed
        const sevenDaysFromNow = addDays(new Date(), 7)
        const shouldRefresh = row.botTokenExpiresAt && row.botTokenExpiresAt < sevenDaysFromNow

        if (shouldRefresh) {
          console.log(`[v0] Auto-refreshing bot token for Telegram user ${row.telegramUserId}`)
          try {
            await issueBotToken(row.userId, row.telegramUserId, 30)
          } catch (error) {
            console.error("[v0] Failed to auto-refresh bot token:", error)
          }
        }

        // Update last seen timestamp for session tracking
        await db
          .update(telegramLinks)
          .set({ lastSeenAt: new Date() })
          .where(eq(telegramLinks.telegramUserId, row.telegramUserId))
        return { userId: row.userId }
      }
    }
  }

  return null
}

export async function issueBotToken(userId: string, telegramUserId: number, ttlDays = 30) {
  const db = getDb()
  const token = generateBotToken()
  const hash = hashBotToken(token)
  const expires = addDays(new Date(), ttlDays)

  console.log(
    `[v0] Issuing bot token for user ${userId}, Telegram ID ${telegramUserId}, expires ${expires.toISOString()}`,
  )

  // upsert link row
  const existingRows = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.telegramUserId, telegramUserId))
    .limit(1)
  const existing = existingRows && existingRows.length ? existingRows[0] : null

  if (existing) {
    await db
      .update(telegramLinks)
      .set({
        botTokenHash: hash,
        botTokenExpiresAt: expires,
        updatedAt: new Date(),
        isRevoked: false,
        lastSeenAt: new Date(), // Track when token was issued
      })
      .where(eq(telegramLinks.telegramUserId, telegramUserId))
  } else {
    await db.insert(telegramLinks).values({
      telegramUserId,
      userId,
      linkedVia: "code",
      isRevoked: false,
      botTokenHash: hash,
      botTokenExpiresAt: expires,
      lastSeenAt: new Date(),
    })
  }

  return { token, expiresAt: expires }
}

export async function validateBotSession(
  telegramUserId: number,
): Promise<{ valid: boolean; userId?: string; needsRefresh?: boolean }> {
  const db = getDb()
  const now = new Date()

  const linkRows = await db
    .select()
    .from(telegramLinks)
    .where(and(eq(telegramLinks.telegramUserId, telegramUserId), eq(telegramLinks.isRevoked, false)))
    .limit(1)
  const link = linkRows && linkRows.length ? linkRows[0] : null

  if (!link) {
    return { valid: false }
  }

  // Check if token is expired
  if (link.botTokenExpiresAt && link.botTokenExpiresAt <= now) {
    return { valid: false, userId: link.userId }
  }

  // Check if token needs refresh (expires within 7 days)
  const sevenDaysFromNow = addDays(now, 7)
  const needsRefresh = link.botTokenExpiresAt && link.botTokenExpiresAt < sevenDaysFromNow

  return {
    valid: true,
    userId: link.userId,
    needsRefresh: needsRefresh || false,
  }
}

export async function getUserBotSessions(userId: string) {
  const db = getDb()
  const now = new Date()

  const sessions = await db
    .select()
    .from(telegramLinks)
    .where(and(eq(telegramLinks.userId, userId), eq(telegramLinks.isRevoked, false), gt(telegramLinks.botTokenExpiresAt, now)))

  return sessions.map((session) => ({
    telegramUserId: session.telegramUserId,
    telegramUsername: session.telegramUsername,
    linkedVia: session.linkedVia,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.botTokenExpiresAt,
  }))
}

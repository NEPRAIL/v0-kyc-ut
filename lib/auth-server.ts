import { cookies, headers } from "next/headers"
import { verifySession } from "@/lib/security"
import { getDb } from "@/lib/db"
import { eq, and, gt } from "drizzle-orm"
import { telegramLinks } from "@/lib/db/schema"
import { botTokenFromAuthHeader, hashBotToken, generateBotToken } from "@/lib/bot-auth"
import { addDays } from "date-fns"

export async function requireAuth() {
  const raw = cookies().get("session")?.value
  if (!raw) return { ok: false as const, status: 401 as const }
  const session = await verifySession(raw)
  if (!session?.uid) return { ok: false as const, status: 401 as const }
  return { ok: true as const, userId: session.uid, session }
}

// Returns { userId } if authenticated via cookie session OR bot token
export async function getAuthFromRequest(): Promise<{ userId: string } | null> {
  // 1) try cookie session (browser)
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get("session")?.value
  if (sessionCookie) {
    const s = await verifySession(sessionCookie)
    if (s?.uid) return { userId: s.uid }
  }

  // 2) try bot token (Authorization header)
  const hdrs = headers()
  const authHeader = hdrs.get("authorization")
  if (authHeader) {
    const token = botTokenFromAuthHeader(new Request("http://local", { headers: { authorization: authHeader } }))
    if (token) {
      const db = getDb()
      const hash = hashBotToken(token)
      const now = new Date()
      const row = await db.query.telegramLinks.findFirst({
        where: and(
          eq(telegramLinks.botTokenHash, hash),
          eq(telegramLinks.isRevoked, false),
          gt(telegramLinks.botTokenExpiresAt, now),
        ),
      })
      if (row?.userId) {
        // touch lastSeenAt
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

  // upsert link row
  const existing = await db.query.telegramLinks.findFirst({
    where: eq(telegramLinks.telegramUserId, telegramUserId),
  })

  if (existing) {
    await db
      .update(telegramLinks)
      .set({ botTokenHash: hash, botTokenExpiresAt: expires, updatedAt: new Date(), isRevoked: false })
      .where(eq(telegramLinks.telegramUserId, telegramUserId))
  } else {
    await db.insert(telegramLinks).values({
      telegramUserId,
      userId,
      linkedVia: "code",
      isRevoked: false,
      botTokenHash: hash,
      botTokenExpiresAt: expires,
    })
  }

  return { token, expiresAt: expires }
}

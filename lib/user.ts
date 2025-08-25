// lib/user.ts
import { getDb } from "@/lib/db"
import { users, orders, telegramLinks } from "@/lib/db/schema"
import { eq, sql, desc } from "drizzle-orm"

export type SafeUser = { id: string; username: string | null; email: string | null } | null
export type SafeTelegram = { telegramUserId: string; telegramUsername: string | null } | null
export type SafeOrder = {
  id: string
  totalCents: number
  currency: string
  status: string
  createdAt: Date | string | null
}

export async function loadUserSafe(id: string): Promise<SafeUser> {
  const db = getDb()
  try {
    const rows = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users)
      .where(eq(users.id, id as any))
      .limit(1)
    if (rows[0]) return rows[0]
  } catch (e) {
    console.error("[loadUserSafe] eq() failed:", e)
  }

  try {
    const res: any = await db.execute(sql`select id, username, email from users where id = ${id}::uuid limit 1`)
    const row = Array.isArray(res?.rows) ? res.rows[0] : res?.[0]
    if (row) return { id: String(row.id), username: row.username ?? null, email: row.email ?? null }
  } catch (e) {
    console.warn("[loadUserSafe] uuid cast failed:", e)
  }
  return null
}

export async function loadTelegramLinkSafe(userId: string): Promise<SafeTelegram> {
  const db = getDb()
  try {
    const rows = await db
      .select({
        telegramUserId: telegramLinks.telegramUserId,
        telegramUsername: telegramLinks.telegramUsername,
      })
      .from(telegramLinks)
      .where(eq(telegramLinks.userId, userId as any))
      .limit(1)
    return rows[0] ?? null
  } catch (e) {
    console.warn("[loadTelegramLinkSafe] failed:", e)
    return null
  }
}

export async function loadRecentOrdersSafe(userId: string, limit = 10): Promise<SafeOrder[]> {
  const db = getDb()
  try {
    const rows = await db
      .select({
        id: orders.id,
        totalCents: orders.totalCents,
        currency: orders.currency,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, userId as any))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
    return rows as any
  } catch (e) {
    console.warn("[loadRecentOrdersSafe] eq() failed:", e)
  }

  try {
    const res: any = await db.execute(
      sql`select id, total_cents as "totalCents", currency, status, created_at as "createdAt"
          from orders where user_id = ${userId}::uuid
          order by created_at desc limit ${limit}`,
    )
    return (Array.isArray(res?.rows) ? res.rows : []) as any
  } catch (e) {
    console.warn("[loadRecentOrdersSafe] uuid cast failed:", e)
    return []
  }
}

import { executeQuery, executeQuerySingle } from "@/lib/database/connection"
import type { User } from "@/lib/database/schema"
import { generateSessionToken } from "./security"

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
  const sessionToken = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_DURATION)

  await executeQuery(
    `INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, sessionToken, expiresAt, ipAddress, userAgent],
  )

  return sessionToken
}

export async function getSessionUser(sessionToken: string): Promise<User | null> {
  const result = await executeQuerySingle<User & { session_expires: Date }>(
    `SELECT u.*, s.expires_at as session_expires
     FROM users u
     JOIN user_sessions s ON u.id = s.user_id
     WHERE s.session_token = $1 AND s.expires_at > NOW()`,
    [sessionToken],
  )

  if (!result) return null

  // Update last login
  await executeQuery(`UPDATE users SET last_login = NOW() WHERE id = $1`, [result.id])

  return result
}

export async function deleteSession(sessionToken: string): Promise<void> {
  await executeQuery(`DELETE FROM user_sessions WHERE session_token = $1`, [sessionToken])
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await executeQuery(`DELETE FROM user_sessions WHERE user_id = $1`, [userId])
}

export async function cleanupExpiredSessions(): Promise<void> {
  await executeQuery(`DELETE FROM user_sessions WHERE expires_at < NOW()`)
}

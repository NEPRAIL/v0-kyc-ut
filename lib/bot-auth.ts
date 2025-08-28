import "server-only"
import { randomBytes, createHash } from "node:crypto"

const BOT_TOKEN_PREFIX = "bot_"

export function generateBotToken(): string {
  // opaque random token
  const raw = randomBytes(32).toString("base64url")
  return BOT_TOKEN_PREFIX + raw
}

export function hashBotToken(token: string): string {
  // never store the raw token, only the hash
  return createHash("sha256").update(token, "utf8").digest("hex")
}

export function botTokenFromAuthHeader(req: Request): string | null {
  const h = req.headers.get("authorization")
  if (!h) return null
  // accept "Bearer <token>" or "Bot <token>"
  const parts = h.split(/\s+/)
  if (parts.length !== 2) return null
  const token = parts[1].trim()
  if (!token.startsWith("bot_")) return null
  return token
}

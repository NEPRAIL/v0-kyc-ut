import { getDb } from "@/lib/db"
import { apiKeys } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import "server-only"
import { compareApiKeyHash } from "@/lib/security"
import type { NextRequest } from "next/server"

export async function authenticateApiKey(req: NextRequest): Promise<{ userId: string; scopes: string[] } | null> {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

  const apiKey = authHeader.substring(7)
  // Expected format: ak_live_<id>_<secret>
  const match = apiKey.match(/^ak_live_([a-f0-9]+)_(.+)$/)
  if (!match) return null
  const [, keyId, secret] = match

    const db = getDb()
    const keyRecord = await db
      .select()
      .from(apiKeys)
  .where(eq(apiKeys.id, `ak_live_${keyId}`))
      .limit(1)

    if (keyRecord.length === 0) {
      return null
    }

    const key = keyRecord[0]

    // Verify key hash in constant time
  if (!(await compareApiKeyHash(secret, key.keyHash))) {
      return null
    }

    // Update last used timestamp
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id))

    return {
      userId: key.userId,
      scopes: key.scopes || [],
    }
  } catch (error) {
    console.error("API key authentication failed:", error)
    return null
  }
}

import { getDb } from "@/lib/db"
import { apiKeys } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { compareApiKeyHash, parseApiKey } from "@/lib/security"
import type { NextRequest } from "next/server"

export async function authenticateApiKey(req: NextRequest): Promise<{ userId: string; scopes: string[] } | null> {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const apiKey = authHeader.substring(7)
    const parsed = parseApiKey(apiKey)
    if (!parsed) {
      return null
    }

    const db = getDb()
    const keyRecord = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, `ak_live_${parsed.keyId}`))
      .limit(1)

    if (keyRecord.length === 0) {
      return null
    }

    const key = keyRecord[0]

    // Verify key hash in constant time
    if (!compareApiKeyHash(parsed.secret, key.keyHash)) {
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

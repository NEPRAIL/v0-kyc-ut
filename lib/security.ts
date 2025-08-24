import crypto from "crypto"
import type { NextRequest } from "next/server"

export function signSession(payload: { uid: string; exp: number }, secret: string): string {
  const data = JSON.stringify(payload)
  const mac = crypto.createHmac("sha256", secret).update(data).digest("hex")
  const sessionData = Buffer.from(`${data}.${mac}`).toString("base64url")

  const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString()

  return `session=${sessionData}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Expires=${expires}; Path=/`
}

export function parseSession(cookie: string, secret: string): { uid: string } | null {
  try {
    const sessionCookie = cookie.split(";").find((c) => c.trim().startsWith("session="))
    if (!sessionCookie) return null

    const sessionData = sessionCookie.split("=")[1]
    const decoded = Buffer.from(sessionData, "base64url").toString()
    const [data, mac] = decoded.split(".")

    // Verify MAC
    const expectedMac = crypto.createHmac("sha256", secret).update(data).digest("hex")
    if (!crypto.timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(expectedMac, "hex"))) {
      return null
    }

    const payload = JSON.parse(data)

    // Check expiration
    if (Date.now() > payload.exp) {
      return null
    }

    return { uid: payload.uid }
  } catch {
    return null
  }
}

export async function requireUser(req: NextRequest): Promise<string> {
  const sessionSecret = process.env.SESSION_SECRET
  if (!sessionSecret) {
    throw new Error("Server misconfigured: missing SESSION_SECRET")
  }

  const cookie = req.headers.get("cookie") || ""
  const session = parseSession(cookie, sessionSecret)

  if (!session) {
    throw new Error("Unauthorized")
  }

  return session.uid
}

export function randomId(prefix: string): string {
  const random = crypto.randomBytes(16).toString("hex")
  return `${prefix}${random}`
}

export async function hashPassword(password: string): Promise<string> {
  // Using bcryptjs with cost 12 as fallback since oslo/password might not be available
  const bcrypt = await import("bcryptjs")
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs")
  return bcrypt.compare(password, hash)
}

export async function verifySession(sessionData: string): Promise<{ uid: string } | null> {
  try {
    const sessionSecret = process.env.SESSION_SECRET
    if (!sessionSecret) {
      console.error("[v0] Missing SESSION_SECRET environment variable")
      return null
    }

    // Parse the session cookie format: session=<base64url_data>
    const decoded = Buffer.from(sessionData, "base64url").toString()
    const [data, mac] = decoded.split(".")

    // Verify MAC
    const expectedMac = crypto.createHmac("sha256", sessionSecret).update(data).digest("hex")
    if (!crypto.timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(expectedMac, "hex"))) {
      return null
    }

    const payload = JSON.parse(data)

    // Check expiration
    if (Date.now() > payload.exp) {
      return null
    }

    return { uid: payload.uid }
  } catch (error) {
    console.error("[v0] Session verification error:", error)
    return null
  }
}

export function hashApiKey(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex")
}

export function compareApiKeyHash(secret: string, hash: string): boolean {
  const secretHash = hashApiKey(secret)
  return crypto.timingSafeEqual(Buffer.from(secretHash, "hex"), Buffer.from(hash, "hex"))
}

export function generateApiKey(): { keyId: string; secret: string; fullKey: string } {
  const keyId = crypto.randomBytes(8).toString("hex")
  const secret = crypto.randomBytes(32).toString("base64url")
  const fullKey = `ak_live_${keyId}_${secret}`

  return { keyId, secret, fullKey }
}

export function parseApiKey(apiKey: string): { keyId: string; secret: string } | null {
  const match = apiKey.match(/^ak_live_([a-f0-9]+)_(.+)$/)
  if (!match) return null

  return {
    keyId: match[1],
    secret: match[2],
  }
}

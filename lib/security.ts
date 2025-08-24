import crypto from "crypto"
import bcrypt from "bcryptjs"

// auto-detects base64 vs utf8 secret
function getKey() {
  const s = process.env.SESSION_SECRET || ""
  if (!s) return null
  try {
    // try base64
    const k = Buffer.from(s, "base64")
    if (k.length >= 32) return k
  } catch {}
  const k2 = Buffer.from(s, "utf8")
  return k2.length >= 32 ? k2 : null
}

export async function verifySession(cookieVal: string): Promise<{ uid: string; exp: number } | null> {
  try {
    const [payloadB64u, macB64u] = cookieVal.split(".")
    if (!payloadB64u || !macB64u) return null

    const key = getKey()
    if (!key) {
      console.error("[security] SESSION_SECRET missing/short")
      return null
    }

    const payloadJson = Buffer.from(payloadB64u.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    const payload = JSON.parse(payloadJson) as { uid?: string; exp?: number }

    if (!payload?.uid || !payload?.exp) return null

    const mac = crypto.createHmac("sha256", key).update(payloadB64u).digest()
    const macCheck = Buffer.from(macB64u.replace(/-/g, "+").replace(/_/g, "/"), "base64")
    if (mac.length !== macCheck.length || !crypto.timingSafeEqual(mac, macCheck)) return null

    if (Math.floor(Date.now() / 1000) > payload.exp) return null

    return { uid: payload.uid, exp: payload.exp }
  } catch {
    return null // never throw into Server Components
  }
}

export async function signSession(uid: string, expiresInSeconds = 86400): Promise<string> {
  const key = getKey()
  if (!key) throw new Error("SESSION_SECRET missing/short")

  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
  const payload = { uid, exp }
  const payloadJson = JSON.stringify(payload)
  const payloadB64u = Buffer.from(payloadJson, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")

  const mac = crypto.createHmac("sha256", key).update(payloadB64u).digest()
  const macB64u = mac.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")

  return `${payloadB64u}.${macB64u}`
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function randomId(length = 32): string {
  return crypto.randomBytes(length).toString("hex")
}

export async function hashApiKey(apiKey: string): Promise<string> {
  return crypto.createHash("sha256").update(apiKey).digest("hex")
}

export async function compareApiKeyHash(apiKey: string, hash: string): Promise<boolean> {
  const apiKeyHash = await hashApiKey(apiKey)
  return crypto.timingSafeEqual(Buffer.from(apiKeyHash), Buffer.from(hash))
}

export function parseApiKey(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null
  return authHeader.slice(7)
}

import "server-only"
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { authenticator } from "otplib"

// Accept base64 or utf8 secret; require >=32 bytes
function getKey(): Buffer | null {
  const s = process.env.SESSION_SECRET || ""
  if (!s) return null
  try {
    const b64 = Buffer.from(s, "base64")
    if (b64.length >= 32) return b64
  } catch {}
  const raw = Buffer.from(s, "utf8")
  return raw.length >= 32 ? raw : null
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

    const mac = createHmac("sha256", key).update(payloadB64u).digest()
    const macCheck = Buffer.from(macB64u.replace(/-/g, "+").replace(/_/g, "/"), "base64")
    if (mac.length !== macCheck.length || !timingSafeEqual(mac, macCheck)) return null

    if (Math.floor(Date.now() / 1000) > payload.exp) return null
    return { uid: payload.uid, exp: payload.exp }
  } catch {
    return null // never throw into Server Components
  }
}

export async function compareApiKeyHash(plainKey: string, hashedKey: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plainKey, hashedKey)
  } catch {
    return false
  }
}

export function parseApiKey(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }
  return authHeader.substring(7)
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12)
}

export function randomId(): string {
  return randomBytes(16).toString("hex")
}

export function signSession(uid: string, expiresInSeconds = 86400): string {
  const key = getKey()
  if (!key) {
    throw new Error("SESSION_SECRET missing or too short")
  }

  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
  const payload = { uid, exp }
  const payloadJson = JSON.stringify(payload)
  const payloadB64u = Buffer.from(payloadJson, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")

  const mac = createHmac("sha256", key)
    .update(payloadB64u)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")

  return `${payloadB64u}.${mac}`
}

export function issueTotpSecret() {
  return authenticator.generateSecret()
}

export function buildTotpURI({ secret, label, issuer }: { secret: string; label: string; issuer: string }) {
  return authenticator.keyuri(label, issuer, secret)
}

export function verifyTotpToken({ token, secret }: { token: string; secret: string }) {
  return authenticator.check(token, secret)
}

export async function verifyPassword(plain: string, hash: string) {
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}

export async function recordSecurityEvent(_event: {
  userId?: string
  type: string
  ip?: string
  ua?: string
  meta?: Record<string, unknown>
}) {
  /* no-op, or write to DB if available */
}

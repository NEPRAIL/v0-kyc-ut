import { createHmac } from "node:crypto"

const secret = process.env.SESSION_SECRET || "change-me"

export function sign(data: string) {
  return createHmac("sha256", secret).update(data).digest("hex")
}

export function createSessionToken(userId: string) {
  const payload = JSON.stringify({ userId, iat: Date.now() })
  const b64 = Buffer.from(payload).toString("base64url")
  const sig = sign(b64)
  return `${b64}.${sig}`
}

export function verifySessionToken(token?: string) {
  if (!token) return null
  const [b64, sig] = token.split(".")
  if (!b64 || !sig) return null
  if (sign(b64) !== sig) return null
  try {
    const { userId } = JSON.parse(Buffer.from(b64, "base64url").toString())
    return { userId }
  } catch {
    return null
  }
}

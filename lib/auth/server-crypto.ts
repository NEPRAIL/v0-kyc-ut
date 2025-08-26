import { randomBytes, createHmac, timingSafeEqual } from "node:crypto"

// Server-side crypto operations that require Node.js crypto module
export function generateSecureTokenServer(): string {
  return randomBytes(32).toString("hex")
}

export function generateSessionTokenServer(): string {
  return randomBytes(48).toString("base64url")
}

export function createHmacSignature(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data, "utf8").digest("hex")
}

export function verifyHmacSignature(secret: string, data: string, signature: string): boolean {
  const expectedSignature = createHmacSignature(secret, data)
  const providedSignature = signature.startsWith("sha256=") ? signature.slice(7) : signature

  try {
    return timingSafeEqual(Buffer.from(expectedSignature, "hex"), Buffer.from(providedSignature, "hex"))
  } catch {
    return false
  }
}

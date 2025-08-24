import crypto from "crypto"

// Server-side crypto operations that require Node.js crypto module
export function generateSecureTokenServer(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function generateSessionTokenServer(): string {
  return crypto.randomBytes(48).toString("base64url")
}

export function createHmacSignature(secret: string, data: string): string {
  return crypto.createHmac("sha256", secret).update(data, "utf8").digest("hex")
}

export function verifyHmacSignature(secret: string, data: string, signature: string): boolean {
  const expectedSignature = createHmacSignature(secret, data)
  const providedSignature = signature.startsWith("sha256=") ? signature.slice(7) : signature

  try {
    return crypto.timingSafeEqual(Buffer.from(expectedSignature, "hex"), Buffer.from(providedSignature, "hex"))
  } catch {
    return false
  }
}

import { TOTP } from "oslo/otp"
import { encodeBase32LowerCaseNoPadding, decodeBase32IgnoreCase } from "oslo/encoding"

export function generateTOTPSecret(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return encodeBase32LowerCaseNoPadding(bytes)
}

export function generateTOTPUri(secret: string, username: string): string {
  const totp = new TOTP(decodeBase32IgnoreCase(secret))
  return totp.createURI("KYCut", username)
}

export function verifyTOTP(secret: string, token: string): boolean {
  try {
    const totp = new TOTP(decodeBase32IgnoreCase(secret))
    return totp.verify(token, 30)
  } catch {
    return false
  }
}

export function generateQRCodeUrl(uri: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`
}

import bcrypt from "bcryptjs"

// Password security configuration
const SALT_ROUNDS = 12
const MIN_PASSWORD_LENGTH = 8
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

export interface PasswordValidation {
  isValid: boolean
  errors: string[]
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS)
  const hash = await bcrypt.hash(password, salt)
  return { hash, salt }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateSecureToken(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    // Browser environment - use Web Crypto API
    const array = new Uint8Array(32)
    window.crypto.getRandomValues(array)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
  } else {
    // Server environment - will be handled by API routes
    throw new Error("Token generation must be done server-side. Use /api/auth/generate-token endpoint.")
  }
}

export function generateSessionToken(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    // Browser environment - use Web Crypto API
    const array = new Uint8Array(48)
    window.crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
      .replace(/[+/]/g, (c) => (c === "+" ? "-" : "_"))
      .replace(/=/g, "")
  } else {
    // Server environment - will be handled by API routes
    throw new Error("Session token generation must be done server-side. Use /api/auth/session endpoint.")
  }
}

// Two-Factor Authentication
export function generateTwoFactorSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let secret = ""
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return secret
}

export function generateTwoFactorQR(secret: string, email: string): string {
  const issuer = encodeURIComponent("KYCut")
  const label = encodeURIComponent(email)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`
}

export function verifyTwoFactorToken(token: string, secret: string): boolean {
  return token.length === 6 && /^\d{6}$/.test(token)
}

// Rate limiting helpers
export function shouldLockAccount(failedAttempts: number): boolean {
  return failedAttempts >= MAX_LOGIN_ATTEMPTS
}

export function getLockoutExpiry(): Date {
  return new Date(Date.now() + LOCKOUT_DURATION)
}

export function isAccountLocked(lockedUntil?: Date): boolean {
  if (!lockedUntil) return false
  return new Date() < lockedUntil
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Username validation
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
  return usernameRegex.test(username)
}

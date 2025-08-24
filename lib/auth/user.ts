import { executeQuery, executeQuerySingle } from "@/lib/database/connection"
import type { User } from "@/lib/database/schema"
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  shouldLockAccount,
  getLockoutExpiry,
  isAccountLocked,
} from "./security"

export interface CreateUserData {
  email: string
  username: string
  password: string
}

export interface LoginResult {
  success: boolean
  user?: User
  error?: string
  requiresVerification?: boolean
  accountLocked?: boolean
}

export async function createUser(userData: CreateUserData): Promise<User> {
  const { email, username, password } = userData
  const { hash, salt } = await hashPassword(password)
  const emailVerificationToken = generateSecureToken()
  const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const [user] = await executeQuery<User>(
    `INSERT INTO users (email, username, password_hash, salt, email_verification_token, email_verification_expires)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [email, username, hash, salt, emailVerificationToken, emailVerificationExpires],
  )

  return user
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return executeQuerySingle<User>(`SELECT * FROM users WHERE email = $1`, [email])
}

export async function getUserByUsername(username: string): Promise<User | null> {
  return executeQuerySingle<User>(`SELECT * FROM users WHERE username = $1`, [username])
}

export async function getUserById(id: string): Promise<User | null> {
  return executeQuerySingle<User>(`SELECT * FROM users WHERE id = $1`, [id])
}

export async function loginUser(emailOrUsername: string, password: string): Promise<LoginResult> {
  // Find user by email or username
  const user = await executeQuerySingle<User>(`SELECT * FROM users WHERE email = $1 OR username = $1`, [
    emailOrUsername,
  ])

  if (!user) {
    return { success: false, error: "Invalid credentials" }
  }

  // Check if account is locked
  if (isAccountLocked(user.locked_until)) {
    return { success: false, error: "Account is temporarily locked", accountLocked: true }
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.password_hash)

  if (!isValidPassword) {
    // Increment failed login attempts
    const newFailedAttempts = user.failed_login_attempts + 1
    const shouldLock = shouldLockAccount(newFailedAttempts)

    await executeQuery(
      `UPDATE users SET 
       failed_login_attempts = $1,
       locked_until = $2
       WHERE id = $3`,
      [newFailedAttempts, shouldLock ? getLockoutExpiry() : null, user.id],
    )

    return {
      success: false,
      error: shouldLock ? "Account locked due to too many failed attempts" : "Invalid credentials",
      accountLocked: shouldLock,
    }
  }

  // Check email verification
  if (!user.email_verified) {
    return { success: false, error: "Please verify your email address", requiresVerification: true }
  }

  // Reset failed login attempts on successful login
  await executeQuery(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`, [user.id])

  return { success: true, user }
}

export async function verifyEmail(token: string): Promise<boolean> {
  const result = await executeQuery(
    `UPDATE users SET 
     email_verified = true,
     email_verification_token = NULL,
     email_verification_expires = NULL
     WHERE email_verification_token = $1 AND email_verification_expires > NOW()
     RETURNING id`,
    [token],
  )

  return result.length > 0
}

export async function requestPasswordReset(email: string): Promise<string | null> {
  const user = await getUserByEmail(email)
  if (!user) return null

  const resetToken = generateSecureToken()
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await executeQuery(
    `UPDATE users SET 
     password_reset_token = $1,
     password_reset_expires = $2
     WHERE id = $3`,
    [resetToken, resetExpires, user.id],
  )

  return resetToken
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const { hash, salt } = await hashPassword(newPassword)

  const result = await executeQuery(
    `UPDATE users SET 
     password_hash = $1,
     salt = $2,
     password_reset_token = NULL,
     password_reset_expires = NULL,
     failed_login_attempts = 0,
     locked_until = NULL
     WHERE password_reset_token = $3 AND password_reset_expires > NOW()
     RETURNING id`,
    [hash, salt, token],
  )

  return result.length > 0
}

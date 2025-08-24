import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface User {
  id: string
  email: string
  username: string
  password_hash: string
  password_salt: string
  email_verified: boolean
  email_verification_token?: string
  email_verification_expires?: Date
  two_factor_secret?: string
  two_factor_enabled: boolean
  failed_login_attempts: number
  locked_until?: Date
  last_login?: Date
  created_at: Date
  updated_at: Date
}

export interface UserSession {
  id: string
  user_id: string
  session_token: string
  expires_at: Date
  ip_address?: string
  user_agent?: string
  created_at: Date
}

export interface PasswordResetToken {
  id: string
  user_id: string
  token: string
  expires_at: Date
  used: boolean
  created_at: Date
}

// User operations
export async function createUser(userData: {
  email: string
  username: string
  password_hash: string
  password_salt: string
  email_verification_token?: string
}): Promise<User> {
  const result = await sql`
    INSERT INTO users (email, username, password_hash, password_salt, email_verification_token, email_verification_expires)
    VALUES (${userData.email}, ${userData.username}, ${userData.password_hash}, ${userData.password_salt}, 
            ${userData.email_verification_token || null}, ${userData.email_verification_token ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null})
    RETURNING *
  `
  return result[0] as User
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await sql`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `
  return (result[0] as User) || null
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const result = await sql`
    SELECT * FROM users WHERE username = ${username} LIMIT 1
  `
  return (result[0] as User) || null
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await sql`
    SELECT * FROM users WHERE id = ${id} LIMIT 1
  `
  return (result[0] as User) || null
}

export async function updateUserLoginAttempts(userId: string, attempts: number, lockUntil?: Date): Promise<void> {
  await sql`
    UPDATE users 
    SET failed_login_attempts = ${attempts}, 
        locked_until = ${lockUntil || null},
        updated_at = NOW()
    WHERE id = ${userId}
  `
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  await sql`
    UPDATE users 
    SET last_login = NOW(), 
        failed_login_attempts = 0, 
        locked_until = NULL,
        updated_at = NOW()
    WHERE id = ${userId}
  `
}

export async function verifyUserEmail(token: string): Promise<boolean> {
  const result = await sql`
    UPDATE users 
    SET email_verified = TRUE, 
        email_verification_token = NULL, 
        email_verification_expires = NULL,
        updated_at = NOW()
    WHERE email_verification_token = ${token} 
      AND email_verification_expires > NOW()
    RETURNING id
  `
  return result.length > 0
}

// Session operations
export async function createSession(sessionData: {
  user_id: string
  session_token: string
  expires_at: Date
  ip_address?: string
  user_agent?: string
}): Promise<UserSession> {
  const result = await sql`
    INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
    VALUES (${sessionData.user_id}, ${sessionData.session_token}, ${sessionData.expires_at}, 
            ${sessionData.ip_address || null}, ${sessionData.user_agent || null})
    RETURNING *
  `
  return result[0] as UserSession
}

export async function getSessionByToken(token: string): Promise<UserSession | null> {
  const result = await sql`
    SELECT * FROM user_sessions 
    WHERE session_token = ${token} AND expires_at > NOW()
    LIMIT 1
  `
  return (result[0] as UserSession) || null
}

export async function deleteSession(token: string): Promise<void> {
  await sql`
    DELETE FROM user_sessions WHERE session_token = ${token}
  `
}

export async function deleteExpiredSessions(): Promise<void> {
  await sql`
    DELETE FROM user_sessions WHERE expires_at <= NOW()
  `
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await sql`
    DELETE FROM user_sessions WHERE user_id = ${userId}
  `
}

// Password reset operations
export async function createPasswordResetToken(userId: string, token: string): Promise<PasswordResetToken> {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  const result = await sql`
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
    RETURNING *
  `
  return result[0] as PasswordResetToken
}

export async function getPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  const result = await sql`
    SELECT * FROM password_reset_tokens 
    WHERE token = ${token} AND expires_at > NOW() AND used = FALSE
    LIMIT 1
  `
  return (result[0] as PasswordResetToken) || null
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  await sql`
    UPDATE password_reset_tokens 
    SET used = TRUE 
    WHERE token = ${token}
  `
}

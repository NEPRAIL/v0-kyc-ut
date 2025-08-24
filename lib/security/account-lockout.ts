import { neon } from "@neondatabase/serverless"
import { securityMonitor } from "./security-monitor"

interface LockoutResult {
  isLocked: boolean
  remainingTime?: number
  attemptsRemaining?: number
}

class AccountLockout {
  private sql = neon(process.env.DATABASE_URL!)
  private maxAttempts = 5
  private lockoutDurationMs = 30 * 60 * 1000 // 30 minutes

  async checkAccountLockout(email: string): Promise<LockoutResult> {
    try {
      const user = await this.sql`
        SELECT id, email, failed_login_attempts, locked_until 
        FROM users 
        WHERE email = ${email} 
        LIMIT 1
      `

      if (user.length === 0) {
        return { isLocked: false }
      }

      const userData = user[0]
      const now = new Date()
      const lockedUntil = userData.locked_until ? new Date(userData.locked_until) : null

      // Check if account is currently locked
      if (lockedUntil && lockedUntil > now) {
        const remainingTime = lockedUntil.getTime() - now.getTime()
        return {
          isLocked: true,
          remainingTime: Math.ceil(remainingTime / 1000), // seconds
        }
      }

      // If lock has expired, reset failed attempts
      if (lockedUntil && lockedUntil <= now) {
        await this.sql`
          UPDATE users 
          SET failed_login_attempts = 0, locked_until = NULL 
          WHERE id = ${userData.id}
        `
        return { isLocked: false, attemptsRemaining: this.maxAttempts }
      }

      const failedAttempts = userData.failed_login_attempts || 0
      const attemptsRemaining = Math.max(0, this.maxAttempts - failedAttempts)

      return {
        isLocked: false,
        attemptsRemaining,
      }
    } catch (error) {
      console.error("Failed to check account lockout:", error)
      return { isLocked: false }
    }
  }

  async recordFailedAttempt(email: string, ipAddress: string, userAgent: string): Promise<LockoutResult> {
    try {
      const user = await this.sql`
        SELECT id, email, failed_login_attempts 
        FROM users 
        WHERE email = ${email} 
        LIMIT 1
      `

      if (user.length === 0) {
        return { isLocked: false }
      }

      const userData = user[0]
      const newFailedAttempts = (userData.failed_login_attempts || 0) + 1

      // Log the failed attempt
      await securityMonitor.logSecurityEvent({
        type: "login_failure",
        userId: userData.id,
        email,
        ipAddress,
        userAgent,
        details: { attempt: newFailedAttempts },
        timestamp: new Date(),
      })

      if (newFailedAttempts >= this.maxAttempts) {
        // Lock the account
        const lockUntil = new Date(Date.now() + this.lockoutDurationMs)

        await this.sql`
          UPDATE users 
          SET failed_login_attempts = ${newFailedAttempts}, 
              locked_until = ${lockUntil.toISOString()}
          WHERE id = ${userData.id}
        `

        // Log account lockout
        await securityMonitor.logSecurityEvent({
          type: "account_locked",
          userId: userData.id,
          email,
          ipAddress,
          userAgent,
          details: { lockUntil: lockUntil.toISOString() },
          timestamp: new Date(),
        })

        return {
          isLocked: true,
          remainingTime: Math.ceil(this.lockoutDurationMs / 1000),
        }
      } else {
        // Update failed attempts count
        await this.sql`
          UPDATE users 
          SET failed_login_attempts = ${newFailedAttempts}
          WHERE id = ${userData.id}
        `

        return {
          isLocked: false,
          attemptsRemaining: this.maxAttempts - newFailedAttempts,
        }
      }
    } catch (error) {
      console.error("Failed to record failed attempt:", error)
      return { isLocked: false }
    }
  }

  async recordSuccessfulLogin(email: string, ipAddress: string, userAgent: string): Promise<void> {
    try {
      const user = await this.sql`
        SELECT id FROM users WHERE email = ${email} LIMIT 1
      `

      if (user.length === 0) return

      const userData = user[0]

      // Reset failed attempts and unlock account
      await this.sql`
        UPDATE users 
        SET failed_login_attempts = 0, 
            locked_until = NULL, 
            last_login = NOW()
        WHERE id = ${userData.id}
      `

      // Log successful login
      await securityMonitor.logSecurityEvent({
        type: "login_success",
        userId: userData.id,
        email,
        ipAddress,
        userAgent,
        timestamp: new Date(),
      })
    } catch (error) {
      console.error("Failed to record successful login:", error)
    }
  }
}

export const accountLockout = new AccountLockout()

import { neon } from "@neondatabase/serverless"

interface SecurityEvent {
  type:
    | "login_attempt"
    | "login_success"
    | "login_failure"
    | "password_reset"
    | "account_locked"
    | "suspicious_activity"
  userId?: string
  email?: string
  ipAddress: string
  userAgent: string
  details?: Record<string, any>
  timestamp: Date
}

class SecurityMonitor {
  private sql = neon(process.env.DATABASE_URL!)

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await this.sql`
        INSERT INTO security_logs (
          event_type, user_id, email, ip_address, user_agent, details, created_at
        ) VALUES (
          ${event.type}, ${event.userId || null}, ${event.email || null}, 
          ${event.ipAddress}, ${event.userAgent}, ${JSON.stringify(event.details || {})}, 
          ${event.timestamp.toISOString()}
        )
      `
    } catch (error) {
      console.error("Failed to log security event:", error)
    }
  }

  async getFailedLoginAttempts(email: string, timeWindowMs: number = 15 * 60 * 1000): Promise<number> {
    try {
      const since = new Date(Date.now() - timeWindowMs)
      const result = await this.sql`
        SELECT COUNT(*) as count 
        FROM security_logs 
        WHERE email = ${email} 
        AND event_type = 'login_failure' 
        AND created_at > ${since.toISOString()}
      `
      return Number.parseInt(result[0]?.count || "0")
    } catch (error) {
      console.error("Failed to get failed login attempts:", error)
      return 0
    }
  }

  async getSuspiciousActivity(userId: string, timeWindowMs: number = 24 * 60 * 60 * 1000): Promise<any[]> {
    try {
      const since = new Date(Date.now() - timeWindowMs)
      const result = await this.sql`
        SELECT * FROM security_logs 
        WHERE user_id = ${userId} 
        AND event_type IN ('login_failure', 'suspicious_activity')
        AND created_at > ${since.toISOString()}
        ORDER BY created_at DESC
        LIMIT 50
      `
      return result
    } catch (error) {
      console.error("Failed to get suspicious activity:", error)
      return []
    }
  }

  async detectSuspiciousActivity(ipAddress: string, userAgent: string): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      // Check for too many requests from same IP
      const ipRequests = await this.sql`
        SELECT COUNT(*) as count 
        FROM security_logs 
        WHERE ip_address = ${ipAddress} 
        AND created_at > ${oneHourAgo.toISOString()}
      `

      const requestCount = Number.parseInt(ipRequests[0]?.count || "0")

      // Flag as suspicious if more than 100 requests per hour from same IP
      if (requestCount > 100) {
        await this.logSecurityEvent({
          type: "suspicious_activity",
          ipAddress,
          userAgent,
          details: { reason: "high_request_rate", count: requestCount },
          timestamp: new Date(),
        })
        return true
      }

      return false
    } catch (error) {
      console.error("Failed to detect suspicious activity:", error)
      return false
    }
  }
}

export const securityMonitor = new SecurityMonitor()

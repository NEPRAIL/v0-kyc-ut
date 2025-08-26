import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const startTime = Date.now()
  const checks = {
    database: false,
    telegram: false,
    environment: false,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "unknown",
  }

  try {
    // Database connectivity check
    try {
      const db = getDb()
      await db.execute("SELECT 1")
      checks.database = true
    } catch (error) {
      console.error("[health] Database check failed:", error)
    }

    // Telegram bot connectivity check
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      if (botToken) {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
          timeout: 5000,
        })
        const data = await response.json()
        checks.telegram = data.ok || false
      }
    } catch (error) {
      console.error("[health] Telegram check failed:", error)
    }

    // Environment variables check
    const requiredEnvVars = ["DATABASE_URL", "SESSION_SECRET", "WEBHOOK_SECRET", "TELEGRAM_BOT_TOKEN"]

    checks.environment = requiredEnvVars.every((envVar) => !!process.env[envVar])

    const responseTime = Date.now() - startTime
    const allHealthy = checks.database && checks.telegram && checks.environment

    return NextResponse.json(
      {
        status: allHealthy ? "healthy" : "unhealthy",
        checks,
        responseTime,
        environment: process.env.NODE_ENV || "development",
      },
      {
        status: allHealthy ? 200 : 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.error("[health] Health check failed:", error)

    return NextResponse.json(
      {
        status: "error",
        error: "Health check failed",
        checks,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    )
  }
}

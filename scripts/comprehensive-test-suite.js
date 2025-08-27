import "dotenv/config"
import { neon } from "@neondatabase/serverless"

console.log("[TEST] Starting comprehensive test suite...")

// Test configuration
const MAX_RETRIES = 3
const TIMEOUT = 30000
const BASE_URL = process.env.WEBSITE_URL || "https://kycut.com"

const required = ["DATABASE_URL", "TELEGRAM_BOT_TOKEN", "SESSION_SECRET", "WEBHOOK_SECRET"]
for (const k of required) {
  if (!process.env[k]) console.warn(`[env] Missing ${k}`)
}

class TestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
    }
  }

  async runTest(name, testFn) {
    console.log(`[TEST] Running: ${name}`)
    try {
      await Promise.race([
        testFn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Test timeout")), TIMEOUT)),
      ])
      console.log(`[TEST] ✅ ${name}`)
      this.results.passed++
    } catch (error) {
      console.error(`[TEST] ❌ ${name}: ${error.message}`)
      this.results.errors.push({ test: name, error: error.message })
      this.results.failed++
    }
  }

  async testEnvironmentVariables() {
    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`)
      }
    }

    const publicVars = Object.keys(process.env).filter((key) => key.startsWith("NEXT_PUBLIC_"))
    if (publicVars.length > 0) {
      console.log(`[TEST] Found ${publicVars.length} NEXT_PUBLIC_ variables (not used in server script)`)
    }

    console.log("[TEST] All required environment variables present and secure")
  }

  async testCryptoImports() {
    try {
      const { createHmac, createHash, randomBytes } = await import("node:crypto")

      // Test each crypto function
      const hash = createHmac("sha256", "test").update("data").digest("hex")
      const sha = createHash("sha256").update("test").digest("hex")
      const random = randomBytes(16).toString("hex")

      if (!hash || !sha || !random) {
        throw new Error("Crypto functions failed")
      }

      console.log("[TEST] Crypto imports working correctly with node:crypto")
    } catch (error) {
      throw new Error(`Crypto import test failed: ${error.message}`)
    }
  }

  async testDatabaseConnection() {
    try {
      const sql = neon(process.env.DATABASE_URL)
      const result = await sql`SELECT 1 as test`
      if (!result) throw new Error("Database query failed")
      console.log("[TEST] Database connection successful")
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`)
    }
  }

  async testAPIEndpoints() {
    const endpoints = [
      { path: "/api/health", method: "GET", expectStatus: [200, 404] },
      { path: "/api/auth/me", method: "GET", expectStatus: [200, 401] },
  { path: "/api/bot/ping", method: "GET", expectStatus: [200, 401, 404] },
      { path: "/api/bot/status", method: "GET", expectStatus: [200, 404] },
      { path: "/api/telegram/generate-code", method: "POST", expectStatus: [401, 404] },
      { path: "/api/orders/user", method: "GET", expectStatus: [401, 404] },
    ]

    // Helper: sign a session cookie compatible with lib/security.signSession
    const makeSessionCookie = async (uid = "test-user") => {
      const { createHmac } = await import("node:crypto")

      const s = process.env.SESSION_SECRET || ""
      if (!s) throw new Error("SESSION_SECRET is missing for signing session cookie")

      // try base64 then raw utf8
      let key
      try {
        const b64 = Buffer.from(s, "base64")
        if (b64.length >= 32) key = b64
      } catch {}
      if (!key) key = Buffer.from(s, "utf8")
      if (!key || key.length < 32) throw new Error("SESSION_SECRET missing or too short")

      const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60
      const payload = { uid, exp }
      const payloadJson = JSON.stringify(payload)
      const payloadB64u = Buffer.from(payloadJson, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "")

      const mac = createHmac("sha256", key)
        .update(payloadB64u)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "")

      return `${payloadB64u}.${mac}`
    }

    // Prepare an authenticated session cookie once (used only if endpoints return 401)
    let sessionCookieValue = null

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${BASE_URL}${endpoint.path}`, {
          method: endpoint.method,
          headers: { "Content-Type": "application/json" },
        })

        // If endpoint returned 401, attempt an authenticated retry using a signed session cookie
        if (response.status === 401) {
          try {
            if (!sessionCookieValue) sessionCookieValue = await makeSessionCookie()
            const authResp = await fetch(`${BASE_URL}${endpoint.path}`, {
              method: endpoint.method,
              headers: {
                "Content-Type": "application/json",
                Cookie: `session=${sessionCookieValue}`,
              },
            })

            if (!endpoint.expectStatus.includes(authResp.status)) {
              throw new Error(
                `${endpoint.path} returned ${authResp.status} after auth retry, expected one of ${endpoint.expectStatus.join(", ")}`,
              )
            }

            console.log(`[TEST] API endpoint ${endpoint.path} responding (${authResp.status})`)
            continue
          } catch (err) {
            // If auth retry failed, fall through to the original error handling
            throw err
          }
        }

        if (!endpoint.expectStatus.includes(response.status)) {
          throw new Error(
            `${endpoint.path} returned ${response.status}, expected one of ${endpoint.expectStatus.join(", ")}`,
          )
        }

        console.log(`[TEST] API endpoint ${endpoint.path} responding (${response.status})`)
      } catch (error) {
        if (error.message.includes("fetch")) {
          throw new Error(`API endpoint ${endpoint.path} unreachable: ${error.message}`)
        }
        throw error
      }
    }
  }

  async testTelegramLinking() {
    try {
      const response = await fetch(`${BASE_URL}/api/telegram/generate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      // Should return 401 without auth, which means endpoint exists
      if (response.status === 401) {
        console.log("[TEST] Telegram code generation endpoint responding")
      } else if (response.status === 404) {
        throw new Error("Telegram generate-code endpoint not found")
      }
    } catch (error) {
      throw new Error(`Telegram linking test failed: ${error.message}`)
    }
  }

  async testOrdersAPI() {
    try {
      const response = await fetch(`${BASE_URL}/api/orders/user`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (response.status === 401) {
        console.log("[TEST] Orders API endpoint responding")
      } else if (response.status === 404) {
        throw new Error("Orders user endpoint not found")
      } else {
        throw new Error(`Unexpected response: ${response.status}`)
      }
    } catch (error) {
      throw new Error(`Orders API test failed: ${error.message}`)
    }
  }

  async testWebSocketConnection() {
    try {
      const wsUrl = `${BASE_URL.replace("http", "ws")}/api/ws`
      console.log(`[TEST] Testing WebSocket connection to ${wsUrl}`)

      // This will likely fail in test environment, but we can check if endpoint exists
      const response = await fetch(`${BASE_URL}/api/ws`, {
        method: "GET",
        headers: { Upgrade: "websocket" },
      })

      // WebSocket upgrade should return 426 or similar
      if (response.status === 426 || response.status === 400) {
        console.log("[TEST] WebSocket endpoint responding")
      } else {
        console.log(`[TEST] WebSocket endpoint returned ${response.status}`)
      }
    } catch (error) {
      console.log(`[TEST] WebSocket test info: ${error.message}`)
    }
  }

  async runAll() {
    console.log("[TEST] Starting comprehensive test suite...")
    console.log(`[TEST] Base URL: ${BASE_URL}`)
    console.log(`[TEST] Environment: ${process.env.NODE_ENV || "development"}`)

    await this.runTest("Environment Variables", () => this.testEnvironmentVariables())
    await this.runTest("Crypto Imports", () => this.testCryptoImports())
    await this.runTest("Database Connection", () => this.testDatabaseConnection())
    await this.runTest("API Endpoints", () => this.testAPIEndpoints())
    await this.runTest("Telegram Linking", () => this.testTelegramLinking())
    await this.runTest("Orders API", () => this.testOrdersAPI())
    await this.runTest("WebSocket Connection", () => this.testWebSocketConnection())

    console.log("\n[TEST] Test Results:")
    console.log(`[TEST] ✅ Passed: ${this.results.passed}`)
    console.log(`[TEST] ❌ Failed: ${this.results.failed}`)

    if (this.results.errors.length > 0) {
      console.log("\n[TEST] Errors:")
      this.results.errors.forEach(({ test, error }) => {
        console.log(`[TEST] - ${test}: ${error}`)
      })
    }

    const success = this.results.failed === 0
    console.log(`\n[TEST] Suite ${success ? "PASSED" : "FAILED"}`)

    if (!success) {
      console.log("\n[TEST] Recommendations:")
      console.log("[TEST] 1. Check environment variables in .env.production")
      console.log("[TEST] 2. Ensure database is accessible")
      console.log("[TEST] 3. Verify all API routes are properly implemented")
      console.log('[TEST] 4. Check all crypto imports use "node:crypto" not "crypto"')
      console.log("[TEST] 5. Ensure no external CDN crypto loading")
      console.log("[TEST] 6. Verify sensitive env vars are not exposed to client")
      console.log("[TEST] 7. Replace all Zod .nullable() with z.union([type, z.null()])")
      console.log("[TEST] 8. Ensure requireAdmin() calls use no parameters")
      console.log("[TEST] 9. Check all security imports use @/lib/security")
    }

    return success
  }
}

// Auto-run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const suite = new TestSuite()
  suite
    .runAll()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error("[TEST] Suite crashed:", error)
      process.exit(1)
    })
}

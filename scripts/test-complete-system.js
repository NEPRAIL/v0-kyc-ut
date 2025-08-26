import { randomUUID } from "node:crypto"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://kycut.com"
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "kycut_webhook_2024_secure_key_789xyz"

let neon, bcrypt
try {
  const neonModule = await import("@neondatabase/serverless")
  neon = neonModule.neon
  console.log("✅ @neondatabase/serverless loaded successfully")
} catch (error) {
  console.log("❌ @neondatabase/serverless not available:", error.message)
  console.log("📝 Install with: npm install @neondatabase/serverless")
}

try {
  const bcryptModule = await import("bcryptjs")
  bcrypt = bcryptModule.default
  console.log("✅ bcryptjs loaded successfully")
} catch (error) {
  console.log("❌ bcryptjs not available:", error.message)
  console.log("📝 Install with: npm install bcryptjs")
}

class SystemTester {
  constructor() {
    this.testResults = []
    this.testUser = null
    this.testOrder = null
    this.linkingCode = null
    this.startTime = Date.now()
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString()
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2)
    const logMessage = `[${timestamp}] [+${elapsed}s] [${type.toUpperCase()}] ${message}`
    console.log(logMessage)

    this.testResults.push({
      timestamp,
      elapsed: Number.parseFloat(elapsed),
      type,
      message,
      success: type !== "error",
    })
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`
    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": WEBHOOK_SECRET,
      },
    }

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    }

    this.log(`🌐 Making ${finalOptions.method || "GET"} request to ${endpoint}`)
    if (finalOptions.body) {
      this.log(`📤 Request body: ${finalOptions.body.substring(0, 200)}${finalOptions.body.length > 200 ? "..." : ""}`)
    }

    try {
      const response = await fetch(url, finalOptions)
      let data
      try {
        data = await response.json()
      } catch {
        data = { error: "Invalid JSON response" }
      }

      this.log(
        `📥 Response ${response.status}: ${JSON.stringify(data).substring(0, 300)}${JSON.stringify(data).length > 300 ? "..." : ""}`,
      )

      return {
        success: response.ok,
        status: response.status,
        data,
        response,
      }
    } catch (error) {
      this.log(`🚨 Request failed: ${error.message}`, "error")
      return {
        success: false,
        error: error.message,
        status: 0,
      }
    }
  }

  async testDatabaseConnection() {
    this.log("🔍 Testing database connection...")

    if (!neon) {
      this.log("❌ Cannot test database - @neondatabase/serverless not available", "error")
      return false
    }

    if (!process.env.DATABASE_URL) {
      this.log("❌ DATABASE_URL environment variable not set", "error")
      return false
    }

    try {
      const sql = neon(process.env.DATABASE_URL)
      this.log("🔗 Connecting to database...")
      const result = await sql`SELECT 1 as test, NOW() as current_time, version() as db_version`

      if (result.length > 0 && result[0].test === 1) {
        this.log(`✅ Database connection successful`, "success")
        this.log(`📊 Database time: ${result[0].current_time}`)
        this.log(`🗄️ Database version: ${result[0].db_version.substring(0, 50)}...`)
        return true
      } else {
        this.log("❌ Database connection failed - invalid response", "error")
        return false
      }
    } catch (error) {
      this.log(`🚨 Database connection failed: ${error.message}`, "error")
      this.log(`💡 Check your DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 30)}...`)
      return false
    }
  }

  async testBotAPI() {
    this.log("Testing Bot API endpoints...")

    // Test bot info endpoint
    const infoResult = await this.makeRequest("/api/bot/info")
    if (infoResult.success) {
      this.log("Bot info endpoint working", "success")
      this.log(`Bot username: ${infoResult.data.bot?.username || "Not configured"}`)
    } else {
      this.log("Bot info endpoint failed", "error")
    }

    // Test bot ping endpoint
    const pingResult = await this.makeRequest("/api/bot/ping", {
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
    })
    if (pingResult.success) {
      this.log("Bot ping endpoint working", "success")
    } else {
      this.log("Bot ping endpoint failed", "error")
    }

    // Test bot status endpoint
    const statusResult = await this.makeRequest("/api/bot/status", {
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
    })
    if (statusResult.success) {
      this.log("Bot status endpoint working", "success")
      this.log(`Active Telegram links: ${statusResult.data.statistics?.active_telegram_links || 0}`)
    } else {
      this.log("Bot status endpoint failed", "error")
    }

    return infoResult.success && pingResult.success && statusResult.success
  }

  async createTestUser() {
    this.log("👤 Creating test user...")

    if (!neon) {
      this.log("❌ Cannot create test user - database not available", "error")
      return false
    }

    if (!bcrypt) {
      this.log("❌ Cannot create test user - bcryptjs not available", "error")
      return false
    }

    const sql = neon(process.env.DATABASE_URL)
    const userId = randomUUID()
    const username = `test_${Date.now()}`
    const email = `test_${Date.now()}@example.com`
    const password = "TestPassword123!"

    try {
      this.log("🔐 Hashing password...")
      const passwordHash = await bcrypt.hash(password, 12)

      this.log("🧹 Cleaning up existing test users...")
      const cleanupResult = await sql`DELETE FROM users WHERE email LIKE 'test_%@example.com'`
      this.log(`🗑️ Cleaned up ${cleanupResult.length || 0} existing test users`)

      this.log("➕ Inserting new test user...")
      const result = await sql`
        INSERT INTO users (id, username, email, password_hash, created_at)
        VALUES (${userId}, ${username}, ${email}, ${passwordHash}, NOW())
        RETURNING id, username, email, created_at
      `

      if (result.length > 0) {
        this.testUser = {
          id: userId,
          username,
          email,
          password,
          ...result[0],
        }
        this.log(`✅ Test user created: ${username} (${email})`, "success")
        this.log(`🆔 User ID: ${userId}`)
        return true
      } else {
        this.log("❌ Failed to create test user - no result returned", "error")
        return false
      }
    } catch (error) {
      this.log(`🚨 Test user creation failed: ${error.message}`, "error")
      this.log(`💡 Error details: ${error.stack?.substring(0, 200)}...`)
      return false
    }
  }

  async testAuthentication() {
    this.log("Testing authentication system...")

    if (!this.testUser) {
      this.log("No test user available for authentication test", "error")
      return false
    }

    // Test login
    const loginResult = await this.makeRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        emailOrUsername: this.testUser.email,
        password: this.testUser.password,
      }),
    })

    if (loginResult.success) {
      this.log("User login successful", "success")

      // Extract session cookie for future requests
      const setCookieHeader = loginResult.response.headers.get("set-cookie")
      if (setCookieHeader) {
        const sessionMatch = setCookieHeader.match(/session=([^;]+)/)
        if (sessionMatch) {
          this.testUser.sessionCookie = `session=${sessionMatch[1]}`
          this.log("Session cookie extracted", "success")
        }
      }

      return true
    } else {
      this.log(`User login failed: ${loginResult.data?.error || "Unknown error"}`, "error")
      return false
    }
  }

  async testTelegramLinking() {
    this.log("Testing Telegram linking system...")

    if (!this.testUser?.sessionCookie) {
      this.log("No authenticated user for Telegram linking test", "error")
      return false
    }

    // Generate linking code
    const codeResult = await this.makeRequest("/api/telegram/generate-code", {
      method: "POST",
      headers: {
        Cookie: this.testUser.sessionCookie,
      },
    })

    if (codeResult.success && codeResult.data.code) {
      this.linkingCode = codeResult.data.code
      this.log(`Linking code generated: ${this.linkingCode}`, "success")

      // Test code verification (simulating bot)
      const verifyResult = await this.makeRequest("/api/telegram/verify-code", {
        method: "POST",
        body: JSON.stringify({
          code: this.linkingCode,
          telegramUserId: 123456789, // Test Telegram user ID
          telegramUsername: "test_user",
        }),
        headers: {
          "X-Webhook-Secret": WEBHOOK_SECRET,
        },
      })

      if (verifyResult.success) {
        this.log("Telegram linking verification successful", "success")
        return true
      } else {
        this.log(`Telegram linking verification failed: ${verifyResult.data?.error}`, "error")
        return false
      }
    } else {
      this.log(`Linking code generation failed: ${codeResult.data?.error}`, "error")
      return false
    }
  }

  async testOrderManagement() {
    this.log("Testing order management system...")

    if (!this.testUser) {
      this.log("No test user for order management test", "error")
      return false
    }

    // Create test order
    const orderResult = await this.makeRequest("/api/orders/create", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            id: "test-product-1",
            name: "Test Product",
            price: 29.99,
            quantity: 2,
          },
        ],
      }),
      headers: {
        Cookie: this.testUser.sessionCookie,
      },
    })

    if (orderResult.success && orderResult.data.order) {
      this.testOrder = orderResult.data.order
      this.log(`Test order created: ${this.testOrder.id}`, "success")

      // Test order status update
      const statusResult = await this.makeRequest(`/api/orders/${this.testOrder.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "confirmed",
          updated_via: "test",
        }),
        headers: {
          "X-Webhook-Secret": WEBHOOK_SECRET,
        },
      })

      if (statusResult.success) {
        this.log("Order status update successful", "success")
        return true
      } else {
        this.log(`Order status update failed: ${statusResult.data?.error}`, "error")
        return false
      }
    } else {
      this.log(`Order creation failed: ${orderResult.data?.error}`, "error")
      return false
    }
  }

  async testOrderSearch() {
    this.log("Testing order search functionality...")

    const searchResult = await this.makeRequest("/api/orders/search?q=test&limit=10", {
      headers: {
        "X-Webhook-Secret": WEBHOOK_SECRET,
      },
    })

    if (searchResult.success) {
      this.log(`Order search successful: ${searchResult.data.orders?.length || 0} results`, "success")
      return true
    } else {
      this.log(`Order search failed: ${searchResult.data?.error}`, "error")
      return false
    }
  }

  async testOrderStats() {
    this.log("Testing order statistics...")

    const statsResult = await this.makeRequest("/api/orders/stats", {
      headers: {
        "X-Webhook-Secret": WEBHOOK_SECRET,
      },
    })

    if (statsResult.success) {
      const stats = statsResult.data.stats
      this.log(`Order stats: ${stats?.total_orders || 0} total, $${stats?.total_value || 0} value`, "success")
      return true
    } else {
      this.log(`Order stats failed: ${statsResult.data?.error}`, "error")
      return false
    }
  }

  async cleanup() {
    this.log("🧹 Cleaning up test data...")

    try {
      const sql = neon(process.env.DATABASE_URL)

      // Clean up test user and related data
      if (this.testUser) {
        await sql`DELETE FROM telegram_links WHERE user_id = ${this.testUser.id}`
        await sql`DELETE FROM orders WHERE user_id = ${this.testUser.id}`
        await sql`DELETE FROM users WHERE id = ${this.testUser.id}`
        this.log("Test user and related data cleaned up", "success")
      }

      // Clean up test linking codes
      await sql`DELETE FROM telegram_linking_codes WHERE code = ${this.linkingCode}`
      this.log("Test linking codes cleaned up", "success")

      return true
    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, "error")
      return false
    }
  }

  async runAllTests() {
    this.log("🚀 Starting comprehensive system test...")
    this.log("=" * 60)
    this.log(`🌍 Base URL: ${BASE_URL}`)
    this.log(`🔐 Webhook Secret: ${WEBHOOK_SECRET ? "Set" : "Not set"}`)
    this.log(`📊 Database URL: ${process.env.DATABASE_URL ? "Set" : "Not set"}`)
    this.log("=" * 60)

    const tests = [
      { name: "Database Connection", fn: () => this.testDatabaseConnection(), critical: true },
      { name: "Bot API Endpoints", fn: () => this.testBotAPI(), critical: false },
      { name: "User Creation", fn: () => this.createTestUser(), critical: true },
      { name: "Authentication", fn: () => this.testAuthentication(), critical: true },
      { name: "Telegram Linking", fn: () => this.testTelegramLinking(), critical: false },
      { name: "Order Management", fn: () => this.testOrderManagement(), critical: true },
      { name: "Order Search", fn: () => this.testOrderSearch(), critical: false },
      { name: "Order Statistics", fn: () => this.testOrderStats(), critical: false },
    ]

    let passedTests = 0
    let criticalFailures = 0
    const totalTests = tests.length

    for (const test of tests) {
      this.log(`🧪 Running test: ${test.name}`)
      const testStartTime = Date.now()

      try {
        const result = await test.fn()
        const testDuration = ((Date.now() - testStartTime) / 1000).toFixed(2)

        if (result) {
          passedTests++
          this.log(`✅ ${test.name} PASSED (${testDuration}s)`, "success")
        } else {
          this.log(`❌ ${test.name} FAILED (${testDuration}s)`, "error")
          if (test.critical) {
            criticalFailures++
            this.log(`🚨 CRITICAL TEST FAILED: ${test.name}`, "error")
          }
        }
      } catch (error) {
        const testDuration = ((Date.now() - testStartTime) / 1000).toFixed(2)
        this.log(`💥 ${test.name} ERROR (${testDuration}s): ${error.message}`, "error")
        this.log(`📋 Stack trace: ${error.stack?.substring(0, 300)}...`)
        if (test.critical) {
          criticalFailures++
        }
      }
      this.log("-" * 40)
    }

    // Cleanup
    this.log("🧹 Starting cleanup...")
    await this.cleanup()

    // Final results
    const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(2)
    this.log("=" * 60)
    this.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} tests passed`)
    this.log(`⏱️ Total duration: ${totalDuration}s`)
    this.log(`🚨 Critical failures: ${criticalFailures}`)

    if (passedTests === totalTests) {
      this.log("🎉 ALL TESTS PASSED! System is working correctly.", "success")
    } else if (criticalFailures === 0) {
      this.log(`⚠️ ${totalTests - passedTests} non-critical tests failed. System is mostly functional.`, "warning")
    } else {
      this.log(`🚨 ${criticalFailures} critical tests failed. System needs immediate attention.`, "error")
    }

    return {
      passed: passedTests,
      total: totalTests,
      criticalFailures,
      success: passedTests === totalTests,
      functional: criticalFailures === 0,
      results: this.testResults,
      duration: Number.parseFloat(totalDuration),
    }
  }
}

const tester = new SystemTester()
tester
  .runAllTests()
  .then((results) => {
    console.log("\n" + "=" * 70)
    console.log("🏁 FINAL TEST SUMMARY")
    console.log("=" * 70)
    console.log(`📊 Total Tests: ${results.total}`)
    console.log(`✅ Passed: ${results.passed}`)
    console.log(`❌ Failed: ${results.total - results.passed}`)
    console.log(`🚨 Critical Failures: ${results.criticalFailures}`)
    console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`)
    console.log(`⏱️ Total Duration: ${results.duration}s`)

    if (results.success) {
      console.log("\n🎉 System is ready for production!")
      process.exit(0)
    } else if (results.functional) {
      console.log("\n⚠️ System is functional but has minor issues.")
      process.exit(1)
    } else {
      console.log("\n🚨 System has critical issues and needs immediate attention.")
      process.exit(2)
    }
  })
  .catch((error) => {
    console.error("💥 Test runner crashed:", error)
    console.error("📋 Stack trace:", error.stack)
    process.exit(3)
  })

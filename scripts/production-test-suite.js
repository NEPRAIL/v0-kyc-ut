import { env } from "../lib/env.js"

const BASE_URL = env.NEXT_PUBLIC_BASE_URL || env.WEBSITE_URL || env.SITE_URL || "http://localhost:3000"
const WEBHOOK_SECRET = env.WEBHOOK_SECRET || env.TELEGRAM_WEBHOOK_SECRET
const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN

console.log("🚀 KYCut Production Test Suite - Enhanced Version")
console.log("=================================================")
console.log(`Testing against: ${BASE_URL}`)
console.log(`Environment: ${env.NODE_ENV}`)
console.log(`Debug enabled: ${env.ALLOW_DEBUG_ROUTES}`)
console.log(`Timestamp: ${new Date().toISOString()}`)
console.log("")

const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  startTime: Date.now(),
  categories: {
    pages: { passed: 0, failed: 0 },
    auth: { passed: 0, failed: 0 },
    orders: { passed: 0, failed: 0 },
    bot: { passed: 0, failed: 0 },
    telegram: { passed: 0, failed: 0 },
    system: { passed: 0, failed: 0 },
  },
}

function logTest(name, status, message = "", category = "general") {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏭️"
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0]
  console.log(`[${timestamp}] ${icon} ${name}: ${status}${message ? ` - ${message}` : ""}`)

  results.tests.push({ name, status, message, category, timestamp })

  if (status === "PASS") {
    results.passed++
    if (results.categories[category]) results.categories[category].passed++
  } else if (status === "FAIL") {
    results.failed++
    if (results.categories[category]) results.categories[category].failed++
  } else {
    results.skipped++
  }
}

async function testEndpoint(name, url, options = {}, category = "general") {
  try {
    console.log(`🔍 Testing: ${name} (${url})`)

    // Use native fetch instead of node-fetch for better compatibility
    const response = await fetch(`${BASE_URL}${url}`, {
      timeout: 15000,
      ...options,
    })

    const isSuccess = response.ok
    const statusText = `${response.status} ${response.statusText}`

    // Try to get response data for better debugging
    let responseData = null
    try {
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }
    } catch (e) {
      // Ignore response parsing errors
    }

    const message = isSuccess
      ? statusText
      : `${statusText}${responseData ? ` | ${JSON.stringify(responseData).substring(0, 100)}` : ""}`

    logTest(name, isSuccess ? "PASS" : "FAIL", message, category)
    return { success: isSuccess, response, data: responseData }
  } catch (error) {
    const errorMessage = error.message.includes("fetch") ? `Network error: ${error.message}` : error.message
    logTest(name, "FAIL", errorMessage, category)
    return { success: false, error }
  }
}

function validateEnvironment() {
  console.log("🔧 Validating Environment Configuration")
  console.log("--------------------------------------")

  const criticalVars = [
    { key: "DATABASE_URL", value: env.DATABASE_URL, required: true },
    { key: "SESSION_SECRET", value: env.SESSION_SECRET, required: true },
    { key: "WEBHOOK_SECRET", value: env.WEBHOOK_SECRET, required: true },
    { key: "TELEGRAM_BOT_TOKEN", value: env.TELEGRAM_BOT_TOKEN, required: true },
    { key: "TELEGRAM_ADMIN_ID", value: env.TELEGRAM_ADMIN_ID, required: true },
  ]

  const optionalVars = [
    { key: "REDIS_URL", value: env.REDIS_URL || env.KV_URL },
    { key: "BITCOIN_ENCRYPTION_KEY", value: env.BITCOIN_ENCRYPTION_KEY },
    { key: "STACK_SECRET_SERVER_KEY", value: env.STACK_SECRET_SERVER_KEY },
  ]

  let envValid = true

  criticalVars.forEach(({ key, value, required }) => {
    const exists = !!value && value !== ""
    const status = exists ? "PASS" : required ? "FAIL" : "SKIP"
    logTest(`Environment: ${key}`, status, exists ? "✓ Set" : "Missing", "system")
    if (required && !exists) envValid = false
  })

  optionalVars.forEach(({ key, value }) => {
    const exists = !!value && value !== ""
    logTest(`Environment: ${key}`, exists ? "PASS" : "SKIP", exists ? "✓ Set" : "Optional", "system")
  })

  return envValid
}

async function runTests() {
  console.log("🏁 Starting Comprehensive Test Suite")
  console.log("====================================")

  // Environment validation first
  const envValid = validateEnvironment()
  if (!envValid) {
    console.log("\n⚠️  Critical environment variables missing. Some tests may fail.")
  }

  console.log("\n🌐 Testing Core Pages")
  console.log("--------------------")
  await testEndpoint("Home Page", "/", {}, "pages")
  await testEndpoint("Shop Page", "/shop", {}, "pages")
  await testEndpoint("Login Page", "/login", {}, "pages")
  await testEndpoint("Signup Page", "/signup", {}, "pages")
  await testEndpoint("Account Page", "/account", {}, "pages")
  await testEndpoint("Orders Page", "/orders", {}, "pages")

  console.log("\n🔐 Testing Authentication System")
  console.log("-------------------------------")
  await testEndpoint("Auth Me Endpoint", "/api/auth/me", {}, "auth")
  await testEndpoint("Auth Sessions Endpoint", "/api/auth/sessions", {}, "auth")
  await testEndpoint("Auth Refresh Token", "/api/auth/refresh-token", { method: "POST" }, "auth")

  console.log("\n📦 Testing Order Management")
  console.log("---------------------------")
  await testEndpoint("Orders User API", "/api/orders/user", {}, "orders")
  await testEndpoint("Orders Search API", "/api/orders/search", {}, "orders")
  await testEndpoint("Orders Stats API", "/api/orders/stats", {}, "orders")
  await testEndpoint("Orders Create API", "/api/orders/create", { method: "POST" }, "orders")

  console.log("\n🤖 Testing Bot APIs")
  console.log("------------------")
  const botHeaders = WEBHOOK_SECRET ? { "X-Webhook-Secret": WEBHOOK_SECRET } : {}

  await testEndpoint("Bot Ping API", "/api/bot/ping", { headers: botHeaders }, "bot")
  await testEndpoint("Bot Status API", "/api/bot/status", { headers: botHeaders }, "bot")
  await testEndpoint("Bot Info API", "/api/bot/info", { headers: botHeaders }, "bot")
  await testEndpoint("Bot Webhook API", "/api/bot/webhook", { method: "POST", headers: botHeaders }, "bot")
  await testEndpoint("Bot Notifications API", "/api/bot/notifications", { method: "POST", headers: botHeaders }, "bot")

  console.log("\n📱 Testing Telegram Integration")
  console.log("------------------------------")
  await testEndpoint(
    "Telegram Generate Code",
    "/api/telegram/generate-code",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    "telegram",
  )

  await testEndpoint(
    "Telegram Link API",
    "/api/telegram/link",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Webhook-Secret": WEBHOOK_SECRET },
      body: JSON.stringify({ code: "TEST1234", telegramUserId: 123456789 }),
    },
    "telegram",
  )

  if (TELEGRAM_BOT_TOKEN) {
    try {
      console.log("🔍 Testing Telegram Bot Connectivity...")
      const botResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`, {
        timeout: 10000,
      })
      const botData = await botResponse.json()

      if (botData.ok) {
        logTest(
          "Telegram Bot Connection",
          "PASS",
          `Bot: @${botData.result.username} (${botData.result.first_name})`,
          "telegram",
        )

        // Test webhook info
        const webhookResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`)
        const webhookData = await webhookResponse.json()

        if (webhookData.ok) {
          const webhookUrl = webhookData.result.url
          logTest("Telegram Webhook Status", "PASS", webhookUrl ? `Set: ${webhookUrl}` : "Not set", "telegram")
        }
      } else {
        logTest("Telegram Bot Connection", "FAIL", botData.description || "Bot not accessible", "telegram")
      }
    } catch (error) {
      logTest("Telegram Bot Connection", "FAIL", error.message, "telegram")
    }
  } else {
    logTest("Telegram Bot Connection", "FAIL", "No bot token configured", "telegram")
  }

  const duration = ((Date.now() - results.startTime) / 1000).toFixed(2)

  console.log("\n📊 Comprehensive Test Results")
  console.log("=============================")
  console.log(`Duration: ${duration}s`)
  console.log(`Total Tests: ${results.passed + results.failed + results.skipped}`)
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`⏭️  Skipped: ${results.skipped}`)
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`)

  console.log("\n📋 Results by Category:")
  Object.entries(results.categories).forEach(([category, stats]) => {
    const total = stats.passed + stats.failed
    if (total > 0) {
      const rate = ((stats.passed / total) * 100).toFixed(1)
      console.log(`   ${category.toUpperCase()}: ${stats.passed}/${total} (${rate}%)`)
    }
  })

  if (results.failed > 0) {
    console.log("\n⚠️  Failed Tests Details:")
    results.tests
      .filter((test) => test.status === "FAIL")
      .forEach((test) => console.log(`   • [${test.category}] ${test.name}: ${test.message}`))
  }

  console.log("\n🎯 Final Recommendations:")
  if (results.failed === 0) {
    console.log("   ✅ All tests passed! Site is production-ready.")
    console.log("   🚀 Ready for deployment to production environment.")
  } else {
    console.log("   ⚠️  Address failed tests before production deployment.")
    console.log("   📋 Verify environment variables in Project Settings.")
    console.log("   🔍 Check server logs for detailed error information.")
    console.log("   🔧 Test locally with production environment variables.")
  }

  return results.failed === 0
}

const MAX_RETRIES = 2
let retryCount = 0

async function runTestsWithRetry() {
  try {
    return await runTests()
  } catch (error) {
    retryCount++
    console.error(`❌ Test suite attempt ${retryCount} failed:`, error.message)

    if (retryCount >= MAX_RETRIES) {
      console.error("🛑 Maximum retries reached. Exiting.")
      return false
    }

    console.log(`🔄 Retrying in 3 seconds... (${retryCount}/${MAX_RETRIES})`)
    await new Promise((resolve) => setTimeout(resolve, 3000))
    return runTestsWithRetry()
  }
}

// Execute the test suite
runTestsWithRetry()
  .then((success) => {
    const message = success ? "✅ Test suite completed successfully" : "❌ Test suite completed with failures"
    console.log(`\n${message}`)
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error("❌ Test suite failed:", error)
    process.exit(1)
  })

setTimeout(() => {
  console.error("🛑 Test suite timeout (45s) - forcing exit")
  process.exit(1)
}, 45000)

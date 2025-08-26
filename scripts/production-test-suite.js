import fetch from "node-fetch"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://kycut.com"
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

console.log("🚀 KYCut Production Test Suite")
console.log("================================")
console.log(`Testing against: ${BASE_URL}`)
console.log(`Timestamp: ${new Date().toISOString()}`)
console.log("")

const results = {
  passed: 0,
  failed: 0,
  tests: [],
}

function logTest(name, status, message = "") {
  const icon = status === "PASS" ? "✅" : "❌"
  console.log(`${icon} ${name}: ${status}${message ? ` - ${message}` : ""}`)

  results.tests.push({ name, status, message })
  if (status === "PASS") results.passed++
  else results.failed++
}

async function testEndpoint(name, url, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      timeout: 10000,
      ...options,
    })

    const isSuccess = response.ok
    const statusText = `${response.status} ${response.statusText}`

    logTest(name, isSuccess ? "PASS" : "FAIL", statusText)
    return { success: isSuccess, response, data: await response.json().catch(() => null) }
  } catch (error) {
    logTest(name, "FAIL", error.message)
    return { success: false, error }
  }
}

async function runTests() {
  console.log("🔍 Testing Core Endpoints")
  console.log("-------------------------")

  // Core page tests
  await testEndpoint("Home Page", "/")
  await testEndpoint("Shop Page", "/shop")
  await testEndpoint("Login Page", "/login")
  await testEndpoint("Account Page", "/account")
  await testEndpoint("Orders Page", "/orders")

  console.log("\n🔐 Testing Authentication APIs")
  console.log("------------------------------")

  // Auth API tests
  await testEndpoint("Auth Me Endpoint", "/api/auth/me")
  await testEndpoint("Auth Sessions Endpoint", "/api/auth/sessions")

  console.log("\n📦 Testing Order Management APIs")
  console.log("--------------------------------")

  // Order API tests
  await testEndpoint("Orders User API", "/api/orders/user")
  await testEndpoint("Orders Search API", "/api/orders/search")
  await testEndpoint("Orders Stats API", "/api/orders/stats")

  console.log("\n🤖 Testing Bot APIs")
  console.log("-------------------")

  // Bot API tests with webhook secret
  const botHeaders = WEBHOOK_SECRET ? { "X-Webhook-Secret": WEBHOOK_SECRET } : {}

  await testEndpoint("Bot Ping API", "/api/bot/ping", { headers: botHeaders })
  await testEndpoint("Bot Status API", "/api/bot/status", { headers: botHeaders })
  await testEndpoint("Bot Info API", "/api/bot/info", { headers: botHeaders })

  console.log("\n📱 Testing Telegram Integration")
  console.log("-------------------------------")

  // Telegram API tests
  await testEndpoint("Telegram Generate Code", "/api/telegram/generate-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })

  console.log("\n🔧 Testing System Health")
  console.log("------------------------")

  // Environment variable checks
  const requiredEnvVars = [
    "DATABASE_URL",
    "SESSION_SECRET",
    "WEBHOOK_SECRET",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_ADMIN_ID",
  ]

  requiredEnvVars.forEach((envVar) => {
    const exists = !!process.env[envVar]
    logTest(`Environment Variable: ${envVar}`, exists ? "PASS" : "FAIL", exists ? "Set" : "Missing")
  })

  // Telegram bot connectivity test
  if (TELEGRAM_BOT_TOKEN) {
    try {
      const botResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`, {
        timeout: 5000,
      })
      const botData = await botResponse.json()

      logTest(
        "Telegram Bot Connection",
        botData.ok ? "PASS" : "FAIL",
        botData.ok ? `Bot: @${botData.result.username}` : "Bot not accessible",
      )
    } catch (error) {
      logTest("Telegram Bot Connection", "FAIL", error.message)
    }
  } else {
    logTest("Telegram Bot Connection", "FAIL", "No bot token configured")
  }

  console.log("\n📊 Test Results Summary")
  console.log("=======================")
  console.log(`Total Tests: ${results.passed + results.failed}`)
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`)

  if (results.failed > 0) {
    console.log("\n⚠️  Failed Tests:")
    results.tests
      .filter((test) => test.status === "FAIL")
      .forEach((test) => console.log(`   • ${test.name}: ${test.message}`))
  }

  console.log("\n🎯 Recommendations:")
  if (results.failed === 0) {
    console.log("   ✅ All tests passed! Site is ready for deployment.")
  } else {
    console.log("   ⚠️  Fix failed tests before deploying to production.")
    console.log("   📋 Check environment variables and API configurations.")
    console.log("   🔍 Review server logs for detailed error information.")
  }

  return results.failed === 0
}

// Run the test suite
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error("❌ Test suite failed:", error)
    process.exit(1)
  })

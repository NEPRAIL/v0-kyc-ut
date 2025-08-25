import https from "https"
import { URL } from "url"

// Configuration
const WEBSITE_URL = process.env.WEBSITE_URL || "https://kycut.com"
const TEST_EMAIL = `test_${Date.now()}@example.com`
const TEST_PASSWORD = "TestPassword123!"

console.log("[TEST] Starting comprehensive test script")
console.log("[TEST] Website URL:", WEBSITE_URL)
console.log("[TEST] Test email:", TEST_EMAIL)

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: {
        "User-Agent": "KYCut-Test-Script/1.0",
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    }

    if (options.body) {
      const bodyString = JSON.stringify(options.body)
      requestOptions.headers["Content-Length"] = Buffer.byteLength(bodyString)
    }

    console.log(`[HTTP] ${requestOptions.method} ${url}`)
    if (options.body) {
      console.log("[HTTP] Request body:", JSON.stringify(options.body, null, 2))
    }

    const req = https.request(requestOptions, (res) => {
      let data = ""

      res.on("data", (chunk) => {
        data += chunk
      })

      res.on("end", () => {
        console.log(`[HTTP] Response status: ${res.statusCode}`)
        console.log("[HTTP] Response headers:", JSON.stringify(res.headers, null, 2))

        let parsedData
        try {
          parsedData = JSON.parse(data)
          console.log("[HTTP] Response body:", JSON.stringify(parsedData, null, 2))
        } catch (e) {
          parsedData = data
          console.log("[HTTP] Response body (raw):", data.substring(0, 500))
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsedData,
          cookies: res.headers["set-cookie"] || [],
        })
      })
    })

    req.on("error", (error) => {
      console.error("[HTTP] Request error:", error)
      reject(error)
    })

    if (options.body) {
      req.write(JSON.stringify(options.body))
    }

    req.end()
  })
}

// Extract cookies from response
function extractCookies(cookies) {
  const cookieMap = {}
  cookies.forEach((cookie) => {
    const [nameValue] = cookie.split(";")
    const [name, value] = nameValue.split("=")
    if (name && value) {
      cookieMap[name.trim()] = value.trim()
    }
  })
  return cookieMap
}

// Format cookies for request
function formatCookies(cookieMap) {
  return Object.entries(cookieMap)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ")
}

async function testFlow() {
  let sessionCookies = {}

  try {
    console.log("\n=== STEP 1: Create Test Account ===")

    // Create test account
    const registerResponse = await makeRequest(`${WEBSITE_URL}/api/auth/register`, {
      method: "POST",
      body: {
        username: `testuser_${Date.now()}`, // Generate unique username
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    })

    if (registerResponse.status !== 200 && registerResponse.status !== 201) {
      console.error("[ERROR] Failed to create test account:", registerResponse.status)
      console.error("[ERROR] Response:", registerResponse.data)
      return
    }

    console.log("[SUCCESS] Test account created successfully")

    // Extract session cookies from registration
    if (registerResponse.cookies.length > 0) {
      sessionCookies = extractCookies(registerResponse.cookies)
      console.log("[INFO] Session cookies from registration:", sessionCookies)
    }

    console.log("\n=== STEP 2: Login to Test Account ===")

    // Login to get session
    const loginResponse = await makeRequest(`${WEBSITE_URL}/api/auth/login`, {
      method: "POST",
      body: {
        emailOrUsername: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    })

    if (loginResponse.status !== 200) {
      console.error("[ERROR] Failed to login:", loginResponse.status)
      console.error("[ERROR] Response:", loginResponse.data)
      return
    }

    console.log("[SUCCESS] Login successful")

    // Update session cookies from login
    if (loginResponse.cookies.length > 0) {
      const loginCookies = extractCookies(loginResponse.cookies)
      sessionCookies = { ...sessionCookies, ...loginCookies }
      console.log("[INFO] Updated session cookies:", sessionCookies)
    }

    console.log("\n=== STEP 3: Test Session Verification ===")

    // Test /api/auth/me endpoint
    const meResponse = await makeRequest(`${WEBSITE_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        Cookie: formatCookies(sessionCookies),
      },
    })

    console.log("[INFO] Auth me response:", meResponse.status, meResponse.data)

    if (!meResponse.data?.authenticated) {
      console.error("[ERROR] Session not authenticated properly")
      return
    }

    console.log("[SUCCESS] Session verified successfully")

    console.log("\n=== STEP 4: Create Sample Order ===")

    // Create a sample order
    const orderResponse = await makeRequest(`${WEBSITE_URL}/api/checkout/start`, {
      method: "POST",
      headers: {
        Cookie: formatCookies(sessionCookies),
      },
      body: {
        items: [
          {
            id: "test-product-1",
            name: "Test Product",
            price: 2999, // $29.99 in cents
            quantity: 1,
            image: "/placeholder.svg?height=100&width=100",
          },
        ],
        total: 2999,
        currency: "USD",
        customer: {
          name: "Test User",
          email: TEST_EMAIL,
          phone: "+1234567890",
        },
        shipping: {
          address: "123 Test St",
          city: "Test City",
          state: "TS",
          zip: "12345",
          country: "US",
        },
      },
    })

    console.log("[INFO] Order creation response:", orderResponse.status)

    if (orderResponse.status !== 200 && orderResponse.status !== 201) {
      console.error("[ERROR] Failed to create order:", orderResponse.data)
    } else {
      console.log("[SUCCESS] Sample order created:", orderResponse.data)
    }

    console.log("\n=== STEP 5: Test Orders Page ===")

    // Test orders endpoint
    const ordersResponse = await makeRequest(`${WEBSITE_URL}/api/orders/user`, {
      method: "GET",
      headers: {
        Cookie: formatCookies(sessionCookies),
      },
    })

    console.log("[INFO] Orders response status:", ordersResponse.status)
    console.log("[INFO] Orders data:", ordersResponse.data)

    if (ordersResponse.status === 200 && ordersResponse.data?.orders) {
      console.log("[SUCCESS] Orders retrieved successfully")
      console.log("[INFO] Number of orders:", ordersResponse.data.orders.length)

      // Test order data structure
      if (ordersResponse.data.orders.length > 0) {
        const firstOrder = ordersResponse.data.orders[0]
        console.log("[INFO] First order structure:", JSON.stringify(firstOrder, null, 2))

        // Check for potential .toFixed() issues
        console.log("[DEBUG] total_amount type:", typeof firstOrder.total_amount)
        console.log("[DEBUG] total_amount value:", firstOrder.total_amount)

        if (firstOrder.items && Array.isArray(firstOrder.items)) {
          firstOrder.items.forEach((item, index) => {
            console.log(`[DEBUG] Item ${index} price type:`, typeof item.price)
            console.log(`[DEBUG] Item ${index} price value:`, item.price)
          })
        }
      }
    } else {
      console.error("[ERROR] Failed to retrieve orders")
    }

    console.log("\n=== STEP 6: Test Telegram Linking (Generate Code) ===")

    // Test generate linking code
    const generateCodeResponse = await makeRequest(`${WEBSITE_URL}/api/telegram/generate-code`, {
      method: "POST",
      headers: {
        Cookie: formatCookies(sessionCookies),
      },
    })

    console.log("[INFO] Generate code response:", generateCodeResponse.status, generateCodeResponse.data)

    let linkingCode = null
    if (generateCodeResponse.status === 200 && generateCodeResponse.data?.code) {
      linkingCode = generateCodeResponse.data.code
      console.log("[SUCCESS] Linking code generated:", linkingCode)
    } else {
      console.error("[ERROR] Failed to generate linking code")
    }

    console.log("\n=== STEP 7: Test Telegram Linking (Verify Code) ===")

    if (linkingCode) {
      // Simulate bot verification
      const verifyCodeResponse = await makeRequest(`${WEBSITE_URL}/api/telegram/verify-code`, {
        method: "POST",
        body: {
          code: linkingCode,
          telegram_user_id: 123456789,
          telegram_username: "testuser",
        },
      })

      console.log("[INFO] Verify code response:", verifyCodeResponse.status, verifyCodeResponse.data)

      if (verifyCodeResponse.status === 200) {
        console.log("[SUCCESS] Telegram account linked successfully")

        console.log("\n=== STEP 8: Test Telegram Unlink ===")

        // Test unlink functionality
        const unlinkResponse = await makeRequest(`${WEBSITE_URL}/api/telegram/unlink`, {
          method: "POST",
          headers: {
            Cookie: formatCookies(sessionCookies),
          },
        })

        console.log("[INFO] Unlink response:", unlinkResponse.status, unlinkResponse.data)

        if (unlinkResponse.status === 200) {
          console.log("[SUCCESS] Telegram account unlinked successfully")
        } else {
          console.error("[ERROR] Failed to unlink Telegram account")
        }
      } else {
        console.error("[ERROR] Failed to verify linking code")
      }
    }

    console.log("\n=== STEP 9: Cleanup Test Account ===")

    // Note: In a real scenario, you might want to delete the test account
    // For now, we'll just log that the test is complete
    console.log("[INFO] Test completed. Test account email:", TEST_EMAIL)
    console.log("[INFO] You may want to manually delete this test account from the database")
  } catch (error) {
    console.error("[FATAL ERROR] Test script failed:", error)
  }
}

// Run the test
console.log("[TEST] Starting test flow...")
testFlow()
  .then(() => {
    console.log("\n[TEST] Test flow completed")
  })
  .catch((error) => {
    console.error("\n[TEST] Test flow failed:", error)
  })

import { URL } from "url"

// Configuration
const WEBSITE_URL = process.env.WEBSITE_URL || "https://kycut.com"
const TEST_EMAIL = `test_${Date.now()}@example.com`
const TEST_PASSWORD = "TestPassword123!"

console.log("[TEST] Starting comprehensive test script")
console.log("[TEST] Website URL:", WEBSITE_URL)
console.log("[TEST] Test email:", TEST_EMAIL)

// HTTP request helper
async function makeRequest(url, options = {}) {
  const init = {
    method: options.method || "GET",
    headers: {
      "User-Agent": "KYCut-Test-Script/1.0",
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }

  console.log(`[HTTP] ${init.method} ${url}`)
  if (options.body) console.log("[HTTP] Request body:", JSON.stringify(options.body, null, 2))

  const res = await fetch(url, init)
  const headers = {}
  res.headers.forEach((v, k) => (headers[k] = v))
  let data
  try {
    data = await res.json()
    console.log("[HTTP] Response body:", JSON.stringify(data, null, 2))
  } catch (e) {
    data = await res.text()
    console.log("[HTTP] Response body (raw):", data.substring(0, 500))
  }

  const setCookie = headers["set-cookie"]
  const cookies = setCookie ? (Array.isArray(setCookie) ? setCookie : [setCookie]) : []

  console.log(`[HTTP] Response status: ${res.status}`)
  console.log("[HTTP] Response headers:", JSON.stringify(headers, null, 2))

  return { status: res.status, headers, data, cookies }
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
            productId: "test-product-1",
            name: "Test Product",
            price_cents: 2999, // $29.99 in cents
            qty: 1,
            image: "https://placehold.co/100x100?text=Item",
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

    console.log("\n=== STEP 7: Test Telegram Linking (Send /link via real Telegram account) ===")

    if (linkingCode) {
      // Use the Telethon helper to send /link <CODE> from the real Telegram account
      try {
        const { execSync } = await import('node:child_process')
        console.log('[INFO] Sending /link via Telethon helper...')
        const cmd = `python3 scripts/integration/telethon_send_commands.py "/link ${linkingCode}"`
        console.log('[DEBUG] Running:', cmd)
        const out = execSync(cmd, { stdio: 'inherit' })
        console.log('[INFO] Telethon send complete')

        // Poll the server for the linking to appear before unlinking.
        // We'll check both the public orders-by-telegram endpoint and the
        // authenticated /api/auth/me (to see telegram info) for the web session.
        const telegramUserId = null // not known here; we'll only poll orders endpoint by hard-coded id if provided by env
        const pollTimeoutMs = 10000
        const pollIntervalMs = 1000
        const start = Date.now()
        let linked = false

        console.log('[INFO] Polling for link to be created (up to', pollTimeoutMs, 'ms)...')
        while (Date.now() - start < pollTimeoutMs) {
          try {
            // 1) Check orders-by-telegram endpoint using the Telethon account id if present via env
            // This is an optional check; if TELETHON_TEST_TG_ID is set we will use it.
            const tgId = process.env.TELETHON_TEST_TG_ID
            if (tgId) {
              const ordersByTg = await makeRequest(`${WEBSITE_URL}/api/orders/telegram?telegram_user_id=${tgId}`, {
                method: 'GET',
              })
              if (ordersByTg.status === 200 && ordersByTg.data && Array.isArray(ordersByTg.data.orders)) {
                console.log('[INFO] orders/telegram responded; linked state detected')
                linked = true
                break
              }
            }

            // 2) Check authenticated session /api/auth/me for telegram info
            const meCheck = await makeRequest(`${WEBSITE_URL}/api/auth/me`, {
              method: 'GET',
              headers: {
                Cookie: formatCookies(sessionCookies),
              },
            })
            if (meCheck.status === 200 && meCheck.data && meCheck.data.telegram) {
              console.log('[INFO] /api/auth/me shows telegram linked for the web user')
              linked = true
              break
            }
          } catch (e) {
            // ignore transient errors and retry
          }

          await new Promise((r) => setTimeout(r, pollIntervalMs))
        }

        if (!linked) console.log('[WARN] Link not observed within timeout; continuing to unlink test anyway')

        // Now call unlink (via authenticated session) to exercise unlink endpoint
        console.log('\n=== STEP 8: Test Telegram Unlink ===')
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
      } catch (e) {
        console.error('[ERROR] Telethon helper failed:', e)
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

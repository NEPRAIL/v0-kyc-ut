const https = require("https")
const { URL } = require("url")

const BASE_URL = process.env.WEBSITE_URL || "https://kycut.com"

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: options.headers || {},
    }

    const req = https.request(requestOptions, (res) => {
      let data = ""
      res.on("data", (chunk) => {
        data += chunk
      })
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data)),
        })
      })
    })

    req.on("error", reject)

    if (options.body) {
      req.write(options.body)
    }

    req.end()
  })
}

async function debugAuthAndOrders() {
  console.log("[v0] Starting comprehensive auth and order debugging...")
  console.log("[v0] Base URL:", BASE_URL)

  let sessionCookie = null

  try {
    // Test 1: Login and capture session
    console.log("\n=== TEST 1: LOGIN AND SESSION CAPTURE ===")
    const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Debug-Script/1.0",
      },
      body: JSON.stringify({
        emailOrUsername: "TEST",
        password: "12345678",
      }),
    })

    console.log("[v0] Login response status:", loginResponse.status)
    console.log("[v0] Login response headers:", loginResponse.headers)

    const loginData = await loginResponse.text()
    console.log("[v0] Login response body:", loginData)

    // Extract session cookie
    const setCookieHeader = loginResponse.headers["set-cookie"]
    if (setCookieHeader) {
      console.log("[v0] Set-Cookie header:", setCookieHeader)
      const sessionMatch = Array.isArray(setCookieHeader)
        ? setCookieHeader.find((cookie) => cookie.includes("session="))
        : setCookieHeader.match(/session=([^;]+)/)

      if (sessionMatch) {
        sessionCookie = Array.isArray(setCookieHeader) ? sessionMatch.split(";")[0] : `session=${sessionMatch[1]}`
        console.log("[v0] Extracted session cookie:", sessionCookie)
      }
    }

    if (!sessionCookie) {
      console.log("[v0] ❌ No session cookie found in login response")
      return
    }

    // Test 2: Verify session persistence
    console.log("\n=== TEST 2: SESSION VERIFICATION ===")
    const authCheckResponse = await makeRequest(`${BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        Cookie: sessionCookie,
        "User-Agent": "Debug-Script/1.0",
      },
    })

    console.log("[v0] Auth check status:", authCheckResponse.status)
    const authData = await authCheckResponse.text()
    console.log("[v0] Auth check response:", authData)

    if (authCheckResponse.status !== 200) {
      console.log("[v0] ❌ Session verification failed")
      return
    }

    // Test 3: Create test order
    console.log("\n=== TEST 3: ORDER CREATION ===")
    const testOrder = {
      items: [
        {
          id: "test-product-1",
          name: "Test Product",
          price: 29.99,
          quantity: 1,
          image: "/placeholder.svg?height=100&width=100",
        },
      ],
      total: 29.99,
      shippingAddress: {
        name: "Test User",
        address: "123 Test St",
        city: "Test City",
        postalCode: "12345",
        country: "Test Country",
      },
    }

    console.log("[v0] Creating order with data:", JSON.stringify(testOrder, null, 2))

    const orderResponse = await makeRequest(`${BASE_URL}/api/orders/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
        "User-Agent": "Debug-Script/1.0",
      },
      body: JSON.stringify(testOrder),
    })

    console.log("[v0] Order creation status:", orderResponse.status)
    console.log("[v0] Order response headers:", orderResponse.headers)

    const orderData = await orderResponse.text()
    console.log("[v0] Order response body:", orderData)

    if (orderResponse.status === 500) {
      console.log("[v0] ❌ Order creation failed with 500 error")
      console.log("[v0] This indicates a server-side error in the order creation logic")
    } else if (orderResponse.status === 200 || orderResponse.status === 201) {
      console.log("[v0] ✅ Order created successfully")

      // Test 4: Fetch user orders
      console.log("\n=== TEST 4: FETCH USER ORDERS ===")
      const ordersResponse = await makeRequest(`${BASE_URL}/api/orders/user`, {
        method: "GET",
        headers: {
          Cookie: sessionCookie,
          "User-Agent": "Debug-Script/1.0",
        },
      })

      console.log("[v0] Orders fetch status:", ordersResponse.status)
      const ordersData = await ordersResponse.text()
      console.log("[v0] Orders response:", ordersData)
    }
  } catch (error) {
    console.error("[v0] Debug script error:", error)
    console.error("[v0] Error stack:", error.stack)
  }
}

// Run the debug script
debugAuthAndOrders()
  .then(() => {
    console.log("\n[v0] Debug script completed")
  })
  .catch((error) => {
    console.error("[v0] Debug script failed:", error)
  })

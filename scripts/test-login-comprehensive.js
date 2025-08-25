const https = require("https")
const http = require("http")
const { URL } = require("url")

async function testLogin() {
  console.log("[v0] Starting comprehensive login test...")

  // Test credentials
  const testCredentials = [
    { emailOrUsername: "TEST", password: "12345678", description: "Username login" },
    { emailOrUsername: "MAIL@t.com", password: "12345678", description: "Email login" },
    { emailOrUsername: "test", password: "12345678", description: "Lowercase username" },
    { emailOrUsername: "mail@t.com", password: "12345678", description: "Lowercase email" },
  ]

  const baseUrl = process.env.WEBSITE_URL || "https://kycut.com"
  console.log(`[v0] Testing against: ${baseUrl}`)

  for (const creds of testCredentials) {
    console.log(`\n[v0] === Testing ${creds.description} ===`)
    console.log(
      `[v0] Credentials: ${JSON.stringify({ emailOrUsername: creds.emailOrUsername, password: "[REDACTED]" })}`,
    )

    try {
      const result = await makeLoginRequest(baseUrl, creds)
      console.log(`[v0] Response Status: ${result.status}`)
      console.log(`[v0] Response Headers:`, result.headers)
      console.log(`[v0] Response Body:`, result.body)

      if (result.status === 200) {
        console.log(`[v0] ✅ SUCCESS: ${creds.description} login worked!`)
        console.log(`[v0] Session cookie:`, result.headers["set-cookie"])
        break
      } else {
        console.log(`[v0] ❌ FAILED: ${creds.description} login failed`)
      }
    } catch (error) {
      console.log(`[v0] ❌ ERROR: ${creds.description} login threw error:`, error.message)
    }

    // Wait between requests
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

function makeLoginRequest(baseUrl, credentials) {
  return new Promise((resolve, reject) => {
    const url = new URL("/api/auth/login", baseUrl)
    const postData = JSON.stringify(credentials)

    console.log(`[v0] Making request to: ${url.toString()}`)
    console.log(`[v0] Request body: ${postData}`)

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "User-Agent": "v0-login-test/1.0",
        Accept: "application/json",
      },
    }

    console.log(`[v0] Request options:`, options)

    const client = url.protocol === "https:" ? https : http

    const req = client.request(options, (res) => {
      console.log(`[v0] Response received with status: ${res.statusCode}`)

      let body = ""
      res.on("data", (chunk) => {
        body += chunk
        console.log(`[v0] Received chunk: ${chunk.length} bytes`)
      })

      res.on("end", () => {
        console.log(`[v0] Response complete. Total body length: ${body.length}`)

        let parsedBody
        try {
          parsedBody = JSON.parse(body)
          console.log(`[v0] Parsed JSON response:`, parsedBody)
        } catch (e) {
          console.log(`[v0] Failed to parse JSON, raw body:`, body)
          parsedBody = { error: "Invalid JSON response", raw: body }
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsedBody,
        })
      })
    })

    req.on("error", (error) => {
      console.log(`[v0] Request error:`, error.message)
      reject(error)
    })

    req.on("timeout", () => {
      console.log(`[v0] Request timeout`)
      req.destroy()
      reject(new Error("Request timeout"))
    })

    console.log(`[v0] Sending request data...`)
    req.write(postData)
    req.end()

    // Set timeout
    req.setTimeout(10000)
  })
}

async function testDatabaseConnection() {
  console.log("\n[v0] === Testing Database Connection ===")

  try {
    // Try to connect using the direct connection string
    const connectionString =
      "postgresql://neondb_owner:npg_x1jwcekNpil3@ep-late-voice-adcx1xl3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

    console.log("[v0] Testing database connection...")
    console.log("[v0] Connection string (masked):", connectionString.replace(/:[^:@]*@/, ":***@"))

    // Since we can't import pg directly, we'll test via API
    console.log("[v0] Database connection test would require pg module")
    console.log("[v0] Skipping direct database test in this environment")
  } catch (error) {
    console.log("[v0] Database connection error:", error.message)
  }
}

async function runAllTests() {
  console.log("[v0] ========================================")
  console.log("[v0] COMPREHENSIVE LOGIN TROUBLESHOOTING")
  console.log("[v0] ========================================")

  // Test environment
  console.log("[v0] Environment check:")
  console.log("[v0] NODE_ENV:", process.env.NODE_ENV || "undefined")
  console.log("[v0] WEBSITE_URL:", process.env.WEBSITE_URL || "undefined")

  // Test database connection
  await testDatabaseConnection()

  // Test login
  await testLogin()

  console.log("\n[v0] ========================================")
  console.log("[v0] TEST COMPLETE")
  console.log("[v0] ========================================")
}

// Run the tests
runAllTests().catch((error) => {
  console.error("[v0] Test suite failed:", error)
  process.exit(1)
})

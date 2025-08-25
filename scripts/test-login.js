const https = require("https")
const http = require("http")

async function testLogin() {
  console.log("[v0] Starting login test...")

  const testCredentials = [
    { emailOrUsername: "TEST", password: "12345678", description: "Username login" },
    { emailOrUsername: "MAIL@t.com", password: "12345678", description: "Email login" },
    { emailOrUsername: "test", password: "12345678", description: "Lowercase username" },
    { emailOrUsername: "mail@t.com", password: "12345678", description: "Lowercase email" },
  ]

  const baseUrl = process.env.WEBSITE_URL || "https://kycut.com"
  console.log(`[v0] Testing against: ${baseUrl}`)

  for (const creds of testCredentials) {
    console.log(`\n[v0] Testing ${creds.description}:`)
    console.log(
      `[v0] Credentials: ${JSON.stringify({ emailOrUsername: creds.emailOrUsername, password: "[REDACTED]" })}`,
    )

    try {
      const response = await makeLoginRequest(baseUrl, creds)
      console.log(`[v0] Response status: ${response.status}`)
      console.log(`[v0] Response headers:`, response.headers)
      console.log(`[v0] Response body:`, response.body)

      if (response.status === 200) {
        console.log(`[v0] ✅ SUCCESS: ${creds.description} worked!`)
        break
      } else {
        console.log(`[v0] ❌ FAILED: ${creds.description} - Status ${response.status}`)
      }
    } catch (error) {
      console.log(`[v0] ❌ ERROR: ${creds.description} - ${error.message}`)
    }
  }
}

function makeLoginRequest(baseUrl, credentials) {
  return new Promise((resolve, reject) => {
    const url = new URL("/api/auth/login", baseUrl)
    const postData = JSON.stringify(credentials)

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "User-Agent": "KYCut-Test-Script/1.0",
      },
    }

    const client = url.protocol === "https:" ? https : http

    const req = client.request(options, (res) => {
      let body = ""

      res.on("data", (chunk) => {
        body += chunk
      })

      res.on("end", () => {
        let parsedBody
        try {
          parsedBody = JSON.parse(body)
        } catch (e) {
          parsedBody = body
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsedBody,
        })
      })
    })

    req.on("error", (error) => {
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

// Run the test
testLogin().catch(console.error)

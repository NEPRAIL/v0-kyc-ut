const bcrypt = require("bcryptjs")
const { Client } = require("pg")

async function createTestAccount() {
  console.log("[v0] Creating test account...")

  const client = new Client({
    connectionString:
      "postgresql://neondb_owner:npg_x1jwcekNpil3@ep-late-voice-adcx1xl3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
  })

  try {
    await client.connect()
    console.log("[v0] Connected to database")

    // Delete existing test account
    await client.query("DELETE FROM users WHERE username = $1 OR email = $2", ["TEST", "mail@t.com"])
    console.log("[v0] Deleted existing test account")

    // Create new test account
    const hashedPassword = await bcrypt.hash("12345678", 12)
    const userId = require("crypto").randomUUID()

    const result = await client.query(
      `
      INSERT INTO users (id, username, email, password_hash, email_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, username, email
    `,
      [userId, "TEST", "mail@t.com", hashedPassword, false],
    )

    console.log("[v0] Test account created:", result.rows[0])

    // Verify password hash
    const isValid = await bcrypt.compare("12345678", hashedPassword)
    console.log("[v0] Password hash verification:", isValid)

    console.log("[v0] ✅ Test account ready!")
    console.log("[v0] Login credentials:")
    console.log("[v0] Username: TEST")
    console.log("[v0] Email: mail@t.com")
    console.log("[v0] Password: 12345678")
  } catch (error) {
    console.error("[v0] Error creating test account:", error)
  } finally {
    await client.end()
  }
}

createTestAccount()
